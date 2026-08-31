import { db } from "@/src/db/client";
import { ContentAnalysisResultSchema, type ContentAnalysisResult } from "@/src/ai/schemas/content-analysis.schema";
import { fullContentAnalysisWorkflow } from "@/src/workflow/definitions/full-content-analysis-workflow";
import { WorkflowEngine } from "@/src/workflow/workflow-engine";
import type { WorkflowErrorSummary } from "@/src/workflow/events/workflow-event.types";
import { AnalysisResultRepository } from "@/src/workflow/analysis-result.repository";
import { ContentError } from "./content.errors";
import { ContentRepository } from "./content.repository";
import { assertContentStatusTransition } from "./content.state";
import { ContentDeliverableSchema } from "./content.schema";
import type { ContentStatus } from "./content.types";
import { TaskRepository } from "@/src/modules/task/task.repository";
import type { TaskDb } from "@/src/modules/task/task.repository";

export function toContentDeliverable(result: ContentAnalysisResult) {
  return ContentDeliverableSchema.parse({
    schemaVersion: "content-deliverable.v1",
    script: result.generatedScript.script,
    titles: result.marketing.titles,
    coverCopy: result.marketing.coverTexts,
    publishCopy: result.marketing.publishCopy,
    keywords: result.marketing.keywords,
  });
}

type ProcessingDependencies = {
  database?: TaskDb;
  contentRepository?: Pick<ContentRepository, "findDemoUser" | "findById" | "transitionToProcessing" | "restoreAfterProcessingFailure" | "finalizeAiGenerated">;
  taskRepository?: Pick<TaskRepository, "findById" | "findLatestForContent" | "insertTask" | "insertTaskInput" | "updateStatus">;
  analysisResultRepository?: Pick<AnalysisResultRepository, "findByWorkflowRunId">;
  workflowEngine?: Pick<WorkflowEngine, "startWorkflow" | "getLatestRunForTask">;
};

export class ContentProcessingService {
  private readonly database: TaskDb;
  private readonly contentRepository: NonNullable<ProcessingDependencies["contentRepository"]>;
  private readonly taskRepository: NonNullable<ProcessingDependencies["taskRepository"]>;
  private readonly analysisResultRepository: NonNullable<ProcessingDependencies["analysisResultRepository"]>;
  private readonly workflowEngine: Pick<WorkflowEngine, "startWorkflow" | "getLatestRunForTask">;

  constructor(dependencies: ProcessingDependencies = {}) {
    this.database = dependencies.database ?? db;
    this.contentRepository = dependencies.contentRepository ?? new ContentRepository(this.database);
    this.taskRepository = dependencies.taskRepository ?? new TaskRepository(this.database);
    this.analysisResultRepository = dependencies.analysisResultRepository ?? new AnalysisResultRepository(this.database);
    this.workflowEngine = dependencies.workflowEngine ?? new WorkflowEngine({
      onCompleted: (workflowRunId, taskId) => this.handleWorkflowCompletion(workflowRunId, taskId),
      onFailed: (workflowRunId, taskId, error) => this.handleWorkflowFailureFromTask(workflowRunId, taskId, error),
    });
  }

  async start(contentItemId: string) {
    const user = await this.contentRepository.findDemoUser();
    if (!user) throw new Error("Demo User is not seeded.");
    const content = await this.contentRepository.findById(contentItemId, user.id);
    if (!content) throw new ContentError("CONTENT_NOT_FOUND", "ContentItem was not found.");
    assertContentStatusTransition(content.status, "AI_PROCESSING");
    const previousStatus = content.status;

    let taskId: string;
    try {
      taskId = await this.database.transaction(async (transaction) => {
        const task = await this.taskRepository.insertTask(transaction, user.id, `AI Processing: ${content.title}`, "TRANSCRIPT_ANALYSIS", content.id);
        if (!task) throw new Error("Task creation failed.");
        await this.taskRepository.insertTaskInput(transaction, task.id, { inputType: "TRANSCRIPT", content: content.rawContent, metadata: { contentItemId: content.id, processingBeforeStatus: previousStatus } });
        const transitioned = await this.contentRepository.transitionToProcessing(content.id, previousStatus, transaction);
        if (!transitioned) throw new ContentError("CONTENT_INVALID_STATE", "ContentItem changed before processing started.");
        return task.id;
      });
    } catch (error) {
      throw error;
    }

    try {
      const run = await this.workflowEngine.startWorkflow(taskId, fullContentAnalysisWorkflow);
      return { contentItemId: content.id, taskId, workflowRunId: run.id, status: "AI_PROCESSING" as const, run };
    } catch (error) {
      await this.contentRepository.restoreAfterProcessingFailure(content.id, previousStatus, error instanceof Error ? error.message : "Workflow start failed.");
      throw error;
    }
  }

  async latest(contentItemId: string) {
    const user = await this.contentRepository.findDemoUser();
    if (!user) throw new Error("Demo User is not seeded.");
    const content = await this.contentRepository.findById(contentItemId, user.id);
    if (!content) throw new ContentError("CONTENT_NOT_FOUND", "ContentItem was not found.");
    const task = await this.taskRepository.findLatestForContent(content.id, user.id);
    const run = task ? await this.workflowEngine.getLatestRunForTask(task.task.id, user.id) : null;
    return { contentItemId: content.id, taskId: task?.task.id ?? null, run: run ?? null };
  }

  async handleWorkflowCompletion(workflowRunId: string, taskId: string) {
    const task = await this.taskRepository.findById(taskId);
    if (!task?.task.contentItemId) return;
    const analysisResult = await this.analysisResultRepository.findByWorkflowRunId(workflowRunId);
    if (!analysisResult) throw new Error("AnalysisResult was not persisted for the completed workflow.");
    const content = await this.contentRepository.findById(task.task.contentItemId, task.task.userId);
    if (!content) throw new ContentError("CONTENT_NOT_FOUND", "ContentItem was not found.");
    const result = ContentAnalysisResultSchema.parse(analysisResult.resultJson);
    await this.contentRepository.finalizeAiGenerated({ contentItemId: content.id, createdBy: task.task.userId, workflowRunId, analysisResultId: analysisResult.id, baseVersionId: content.currentVersionId, contentJson: toContentDeliverable(result) });
  }

  async handleWorkflowFailureFromTask(workflowRunId: string, taskId: string, error: WorkflowErrorSummary) {
    const task = await this.taskRepository.findById(taskId);
    if (!task?.task.contentItemId) return;
    const metadata = task.input.metadata as Record<string, unknown>;
    const previousStatus = metadata.processingBeforeStatus;
    const status: ContentStatus = previousStatus === "WAITING_REVIEW" || previousStatus === "NEEDS_REVISION" ? previousStatus : "DRAFT";
    await this.handleWorkflowFailure({ contentItemId: task.task.contentItemId, taskId, workflowRunId, previousStatus: status, error: new Error(error.message) });
  }

  async handleWorkflowFailure(input: { contentItemId: string; taskId: string; workflowRunId: string; previousStatus: ContentStatus; error: unknown }) {
    const message = input.error instanceof Error ? input.error.message : "Workflow failed.";
    await this.contentRepository.restoreAfterProcessingFailure(input.contentItemId, input.previousStatus, message);
  }
}
