import { randomUUID } from "node:crypto";

import { getLLMProvider } from "@/src/ai/llm/provider-factory";
import { TaskRepository } from "@/src/modules/task/task.repository";
import { WorkflowRepository } from "./workflow-repository";
import { demoContentWorkflow } from "./definitions/demo-content-workflow";
import { WorkflowFinalizationService } from "./workflow-finalization.service";
import { AnalysisResultRepository } from "./analysis-result.repository";
import { WorkflowUsageService } from "./workflow-usage.service";
import { workflowEventBus } from "./events/in-memory-workflow-event-bus";
import type { WorkflowEventPublisher } from "./events/workflow-event.publisher";
import type { WorkflowErrorSummary, WorkflowEvent, WorkflowEventInput } from "./events/workflow-event.types";
import { isRetryableWorkflowError, WorkflowError } from "./workflow-errors";
import type { WorkflowDefinition, WorkflowContext } from "./workflow-types";

const MAX_STEPS = 20;
const MAX_RETRIES = 2;
const MAX_RUNTIME_MS = 120_000;

type WorkflowTask = NonNullable<Awaited<ReturnType<TaskRepository["findById"]>>>;
type CreatedWorkflow = Awaited<ReturnType<WorkflowRepository["createRunWithSteps"]>>;

export class WorkflowEngine {
  private readonly workflowRepository: WorkflowRepository;
  private readonly taskRepository: TaskRepository;
  private readonly provider;
  private readonly eventPublisher: WorkflowEventPublisher;
  private readonly finalizationService: WorkflowFinalizationService;
  private readonly analysisResultRepository: AnalysisResultRepository;
  private readonly usageService: WorkflowUsageService;

  constructor(options: { provider?: ReturnType<typeof getLLMProvider>; workflowRepository?: WorkflowRepository; taskRepository?: TaskRepository; eventPublisher?: WorkflowEventPublisher; finalizationService?: WorkflowFinalizationService; analysisResultRepository?: AnalysisResultRepository; usageService?: WorkflowUsageService } = {}) {
    this.provider = options.provider ?? getLLMProvider();
    this.workflowRepository = options.workflowRepository ?? new WorkflowRepository();
    this.taskRepository = options.taskRepository ?? new TaskRepository();
    this.eventPublisher = options.eventPublisher ?? workflowEventBus;
    this.finalizationService = options.finalizationService ?? new WorkflowFinalizationService();
    this.analysisResultRepository = options.analysisResultRepository ?? new AnalysisResultRepository();
    this.usageService = options.usageService ?? new WorkflowUsageService();
  }

  async runWorkflow(taskId: string, definition: WorkflowDefinition = demoContentWorkflow) {
    const prepared = await this.prepareRun(taskId, definition);
    return this.executePreparedRun(prepared.task, prepared.created, definition);
  }

  async startWorkflow(taskId: string, definition: WorkflowDefinition = demoContentWorkflow) {
    const prepared = await this.prepareRun(taskId, definition);
    void this.executePreparedRun(prepared.task, prepared.created, definition).catch((error: unknown) => this.failUnexpectedRun(prepared.created.run.id, taskId, error));
    return this.getRun(prepared.created.run.id);
  }

  async getRun(runId: string, userId?: string) {
    const result = userId ? await this.workflowRepository.findRunForUser(runId, userId) : await this.workflowRepository.findRun(runId);
    if (!result) throw new WorkflowError("WORKFLOW_NOT_FOUND", "WorkflowRun was not found.");
    const analysisResult = await this.analysisResultRepository.findByWorkflowRunId(runId);
    return { ...result.run, output: result.run.outputJson, error: result.run.errorMessage, resultAvailable: Boolean(analysisResult), steps: result.steps };
  }

  async getLatestRunForTask(taskId: string, userId?: string) {
    const task = await this.taskRepository.findById(taskId);
    if (!task || (userId && task.task.userId !== userId)) throw new WorkflowError("WORKFLOW_NOT_FOUND", "WorkflowRun was not found.");
    const run = await this.workflowRepository.findLatestRunForTask(taskId);
    return run ? this.getRun(run.id, userId) : null;
  }

  private async prepareRun(taskId: string, definition: WorkflowDefinition): Promise<{ task: WorkflowTask; created: CreatedWorkflow }> {
    if (definition.steps.length === 0 || definition.steps.length > MAX_STEPS) throw new WorkflowError("WORKFLOW_DEFINITION_NOT_FOUND", "Workflow definition has an invalid number of steps.");
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new WorkflowError("WORKFLOW_NOT_FOUND", "Task for workflow was not found.");
    if (task.task.status === "QUEUED" || task.task.status === "RUNNING") throw new WorkflowError("TASK_ALREADY_RUNNING", "Task already has a queued or running workflow.");
    if (task.task.status === "COMPLETED") throw new WorkflowError("WORKFLOW_INVALID_STATE", "Completed tasks cannot be started again.");

    let created: CreatedWorkflow;
    try {
      created = await this.workflowRepository.createRunWithSteps({ taskId, workflowType: definition.type, inputJson: task.input.rawContent }, definition);
    } catch (error) {
      if (this.isUniqueViolation(error)) throw new WorkflowError("TASK_ALREADY_RUNNING", "Task already has a queued or running workflow.");
      throw error;
    }
    await this.taskRepository.updateStatus(taskId, "RUNNING");
    await this.workflowRepository.updateRun(created.run.id, { status: "RUNNING", startedAt: new Date() });
    await this.publish({ eventType: "workflow.started", workflowRunId: created.run.id, taskId, workflowType: definition.type });
    return { task, created };
  }

  private async executePreparedRun(task: WorkflowTask, created: CreatedWorkflow, definition: WorkflowDefinition) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAX_RUNTIME_MS);
    const context: WorkflowContext = {
      workflowRunId: created.run.id,
      taskId: task.task.id,
      userId: task.task.userId,
      provider: this.provider,
      input: { content: task.input.rawContent, inputType: task.input.contentType, metadata: task.input.metadata as Record<string, unknown> },
      previousStepOutputs: {},
      signal: controller.signal,
      recordUsage: async (usage) => {
        if (!context.workflowStepId) return;
        await this.usageService.record({ ...usage, taskId: task.task.id, workflowRunId: created.run.id, workflowStepId: context.workflowStepId, provider: this.provider.name });
      },
    };

    try {
      for (const [index, definitionStep] of definition.steps.entries()) {
        const persistedStep = created.steps[index];
        if (!persistedStep) throw new WorkflowError("WORKFLOW_STEP_FAILED", `Missing persisted step ${definitionStep.key}.`);
        await this.workflowRepository.updateStep(persistedStep.id, { status: "RUNNING", startedAt: new Date() });
        const step = { id: persistedStep.id, key: definitionStep.key, sequence: definitionStep.sequence, title: definitionStep.title };
        context.workflowStepId = persistedStep.id;
        await this.publish({ eventType: "workflow.step.started", workflowRunId: created.run.id, taskId: task.task.id, step });
        let output: unknown;
        let lastError: unknown;
        let retryCount = 0;
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
          try {
            output = await this.executeWithTimeout(definitionStep.execute(context, context.previousStepOutputs), controller.signal);
            lastError = undefined;
            break;
          } catch (error) {
            lastError = error;
            if (!isRetryableWorkflowError(error) || attempt === MAX_RETRIES) break;
            retryCount += 1;
            await this.publish({ eventType: "workflow.step.retrying", workflowRunId: created.run.id, taskId: task.task.id, step, retryCount, error: this.errorSummary(error) });
          }
        }
        if (lastError !== undefined) {
          const message = lastError instanceof Error ? lastError.message : "Workflow step failed.";
          await this.workflowRepository.updateStep(persistedStep.id, { status: "FAILED", errorMessage: message, retryCount, completedAt: new Date() });
          await this.workflowRepository.updateRun(created.run.id, { status: "FAILED", errorMessage: message, failedAt: new Date() });
          await this.taskRepository.updateStatus(task.task.id, "FAILED");
          await this.publish({ eventType: "workflow.step.failed", workflowRunId: created.run.id, taskId: task.task.id, step, retryCount, error: this.errorSummary(lastError) });
          await this.publish({ eventType: "workflow.failed", workflowRunId: created.run.id, taskId: task.task.id, error: this.errorSummary(lastError) });
          return this.getRun(created.run.id);
        }
        context.previousStepOutputs[definitionStep.key] = output;
        await this.workflowRepository.updateStep(persistedStep.id, { status: "SUCCESS", outputJson: output, retryCount, completedAt: new Date() });
        await this.publish({ eventType: "workflow.step.completed", workflowRunId: created.run.id, taskId: task.task.id, step, retryCount });
      }
      if (definition.type === "FULL_CONTENT_ANALYSIS") {
        try {
          await this.finalizationService.finalize({ taskId: task.task.id, workflowRunId: created.run.id, output: {
            analysis: context.previousStepOutputs["content-analysis"],
            hook: context.previousStepOutputs["hook-analysis"],
            structure: context.previousStepOutputs["structure-analysis"],
            emotion: context.previousStepOutputs["emotion-analysis"],
            optimization: context.previousStepOutputs.optimization,
            generatedScript: context.previousStepOutputs["script-generation"],
            marketing: context.previousStepOutputs["marketing-content"],
          } });
        } catch (error) {
          const summary = this.errorSummary(error);
          await this.workflowRepository.updateRun(created.run.id, { status: "FAILED", errorMessage: summary.message, failedAt: new Date() });
          await this.taskRepository.updateStatus(task.task.id, "FAILED");
          await this.publish({ eventType: "workflow.failed", workflowRunId: created.run.id, taskId: task.task.id, error: summary });
          return this.getRun(created.run.id);
        }
        await this.publish({ eventType: "workflow.completed", workflowRunId: created.run.id, taskId: task.task.id, resultAvailable: true });
        return this.getRun(created.run.id);
      }

      const finalOutput = context.previousStepOutputs[definition.steps.at(-1)!.key];
      await this.workflowRepository.updateRun(created.run.id, { status: "COMPLETED", outputJson: finalOutput, completedAt: new Date() });
      await this.taskRepository.updateStatus(task.task.id, "COMPLETED");
      await this.publish({ eventType: "workflow.completed", workflowRunId: created.run.id, taskId: task.task.id });
      return this.getRun(created.run.id);
    } finally {
      clearTimeout(timeout);
    }
  }

  private async failUnexpectedRun(runId: string, taskId: string, error: unknown): Promise<void> {
    const summary = this.errorSummary(error);
    try {
      await this.workflowRepository.updateRun(runId, { status: "FAILED", errorMessage: summary.message, failedAt: new Date() });
      await this.taskRepository.updateStatus(taskId, "FAILED");
      await this.publish({ eventType: "workflow.failed", workflowRunId: runId, taskId, error: summary });
    } catch (persistenceError) {
      console.error("Unexpected workflow failure could not be persisted.", persistenceError);
    }
  }

  private async executeWithTimeout(operation: Promise<unknown>, signal: AbortSignal) {
    if (signal.aborted) throw new WorkflowError("WORKFLOW_TIMEOUT", "Workflow exceeded its maximum runtime.");
    return new Promise<unknown>((resolve, reject) => {
      const onAbort = () => reject(new WorkflowError("WORKFLOW_TIMEOUT", "Workflow exceeded its maximum runtime."));
      signal.addEventListener("abort", onAbort, { once: true });
      operation.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
    });
  }

  private async publish(event: WorkflowEventInput): Promise<void> {
    try {
      await this.eventPublisher.publish({ ...event, eventId: randomUUID(), timestamp: new Date().toISOString() } as WorkflowEvent);
    } catch (error) {
      console.error("Workflow event publishing failed.", error);
    }
  }

  private errorSummary(error: unknown): WorkflowErrorSummary {
    if (error instanceof WorkflowError) return { code: error.code, message: error.message };
    if (error instanceof Error && "code" in error && typeof error.code === "string") return { code: error.code, message: error.message };
    return { code: "WORKFLOW_STEP_FAILED", message: error instanceof Error ? error.message : "Workflow step failed." };
  }

  private isUniqueViolation(error: unknown): boolean {
    if (typeof error !== "object" || error === null) return false;
    if ("code" in error && error.code === "23505") return true;
    return "cause" in error && this.isUniqueViolation(error.cause);
  }
}
