import { getLLMProvider } from "@/src/ai/llm/provider-factory";
import { TaskRepository } from "@/src/modules/task/task.repository";
import { WorkflowRepository } from "./workflow-repository";
import { demoContentWorkflow } from "./definitions/demo-content-workflow";
import { isRetryableWorkflowError, WorkflowError } from "./workflow-errors";
import type { WorkflowDefinition, WorkflowContext } from "./workflow-types";

const MAX_STEPS = 20;
const MAX_RETRIES = 2;
const MAX_RUNTIME_MS = 120_000;

export class WorkflowEngine {
  private readonly workflowRepository: WorkflowRepository;
  private readonly taskRepository: TaskRepository;
  private readonly provider;

  constructor(options: { provider?: ReturnType<typeof getLLMProvider>; workflowRepository?: WorkflowRepository; taskRepository?: TaskRepository } = {}) {
    this.provider = options.provider ?? getLLMProvider();
    this.workflowRepository = options.workflowRepository ?? new WorkflowRepository();
    this.taskRepository = options.taskRepository ?? new TaskRepository();
  }

  async runWorkflow(taskId: string, definition: WorkflowDefinition = demoContentWorkflow) {
    if (definition.steps.length === 0 || definition.steps.length > MAX_STEPS) throw new WorkflowError("WORKFLOW_DEFINITION_NOT_FOUND", "Workflow definition has an invalid number of steps.");
    const task = await this.taskRepository.findById(taskId);
    if (!task) throw new WorkflowError("WORKFLOW_NOT_FOUND", "Task for workflow was not found.");
    if (task.task.status === "QUEUED" || task.task.status === "RUNNING") throw new WorkflowError("TASK_ALREADY_RUNNING", "Task already has a queued or running workflow.");
    if (task.task.status === "COMPLETED") throw new WorkflowError("WORKFLOW_INVALID_STATE", "Completed tasks cannot be started again.");

    await this.taskRepository.updateStatus(taskId, "QUEUED");
    const created = await this.workflowRepository.createRunWithSteps({ taskId, workflowType: definition.type, inputJson: task.input.rawContent }, definition);
    await this.taskRepository.updateStatus(taskId, "RUNNING");
    await this.workflowRepository.updateRun(created.run.id, { status: "RUNNING", startedAt: new Date() });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), MAX_RUNTIME_MS);
    const context: WorkflowContext = {
      workflowRunId: created.run.id,
      taskId,
      userId: task.task.userId,
      provider: this.provider,
      input: { content: task.input.rawContent, inputType: task.input.contentType, metadata: task.input.metadata as Record<string, unknown> },
      previousStepOutputs: {},
      signal: controller.signal,
    };

    try {
      for (const [index, definitionStep] of definition.steps.entries()) {
        const persistedStep = created.steps[index];
        if (!persistedStep) throw new WorkflowError("WORKFLOW_STEP_FAILED", `Missing persisted step ${definitionStep.key}.`);
        await this.workflowRepository.updateStep(persistedStep.id, { status: "RUNNING", startedAt: new Date() });
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
          }
        }
        if (lastError !== undefined) {
          const message = lastError instanceof Error ? lastError.message : "Workflow step failed.";
          await this.workflowRepository.updateStep(persistedStep.id, { status: "FAILED", errorMessage: message, retryCount, completedAt: new Date() });
          await this.workflowRepository.updateRun(created.run.id, { status: controller.signal.aborted ? "FAILED" : "FAILED", errorMessage: message, failedAt: new Date() });
          await this.taskRepository.updateStatus(taskId, "FAILED");
          return this.getRun(created.run.id);
        }
        context.previousStepOutputs[definitionStep.key] = output;
        await this.workflowRepository.updateStep(persistedStep.id, { status: "SUCCESS", outputJson: output, retryCount, completedAt: new Date() });
      }
      const finalOutput = context.previousStepOutputs[definition.steps.at(-1)!.key];
      await this.workflowRepository.updateRun(created.run.id, { status: "COMPLETED", outputJson: finalOutput, completedAt: new Date() });
      await this.taskRepository.updateStatus(taskId, "COMPLETED");
      return this.getRun(created.run.id);
    } finally {
      clearTimeout(timeout);
    }
  }

  async getRun(runId: string) {
    const result = await this.workflowRepository.findRun(runId);
    if (!result) throw new WorkflowError("WORKFLOW_NOT_FOUND", "WorkflowRun was not found.");
    return { ...result.run, output: result.run.outputJson, error: result.run.errorMessage, steps: result.steps };
  }

  private async executeWithTimeout(operation: Promise<unknown>, signal: AbortSignal) {
    if (signal.aborted) throw new WorkflowError("WORKFLOW_TIMEOUT", "Workflow exceeded its maximum runtime.");
    return new Promise<unknown>((resolve, reject) => {
      const onAbort = () => reject(new WorkflowError("WORKFLOW_TIMEOUT", "Workflow exceeded its maximum runtime."));
      signal.addEventListener("abort", onAbort, { once: true });
      operation.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
    });
  }
}
