import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/src/db/client";
import * as schema from "@/src/db/schema";
import type { TaskDb } from "@/src/modules/task/task.repository";
import type { WorkflowDefinition } from "./workflow-types";

export class WorkflowRepository {
  constructor(private readonly database: TaskDb = db) {}

  async createRunWithSteps(input: { taskId: string; workflowType: string; inputJson: unknown }, definition: WorkflowDefinition) {
    return this.database.transaction(async (transaction) => {
      const [task] = await transaction
        .update(schema.tasks)
        .set({ status: "QUEUED", updatedAt: new Date() })
        .where(eq(schema.tasks.id, input.taskId))
        .returning({ id: schema.tasks.id });
      if (!task) throw new Error("Task update failed before WorkflowRun creation.");
      const [run] = await transaction
        .insert(schema.workflowRuns)
        .values({ taskId: input.taskId, workflowType: input.workflowType, status: "PENDING", inputJson: input.inputJson })
        .returning();
      if (!run) throw new Error("WorkflowRun creation failed.");
      const steps = await transaction
        .insert(schema.workflowSteps)
        .values(definition.steps.map((step) => ({ workflowRunId: run.id, stepKey: step.key, stepType: step.stepType, title: step.title, stepOrder: step.sequence, status: "PENDING" as const })))
        .returning();
      return { run, steps };
    });
  }

  async updateRun(runId: string, values: Partial<typeof schema.workflowRuns.$inferInsert>) {
    const [run] = await this.database.update(schema.workflowRuns).set({ ...values, updatedAt: new Date() }).where(eq(schema.workflowRuns.id, runId)).returning();
    return run;
  }

  async updateStep(stepId: string, values: Partial<typeof schema.workflowSteps.$inferInsert>) {
    const [step] = await this.database.update(schema.workflowSteps).set({ ...values, updatedAt: new Date() }).where(eq(schema.workflowSteps.id, stepId)).returning();
    return step;
  }

  async findRun(runId: string) {
    const [run, steps] = await Promise.all([
      this.database.select().from(schema.workflowRuns).where(eq(schema.workflowRuns.id, runId)),
      this.database.select().from(schema.workflowSteps).where(eq(schema.workflowSteps.workflowRunId, runId)).orderBy(asc(schema.workflowSteps.stepOrder)),
    ]);
    return run[0] ? { run: run[0], steps } : undefined;
  }

  async findRunForUser(runId: string, userId: string) {
    const ownedRun = await this.database
      .select({ id: schema.workflowRuns.id })
      .from(schema.workflowRuns)
      .innerJoin(schema.tasks, eq(schema.tasks.id, schema.workflowRuns.taskId))
      .where(and(eq(schema.workflowRuns.id, runId), eq(schema.tasks.userId, userId)));
    if (!ownedRun[0]) return undefined;
    return this.findRun(runId);
  }

  async findLatestRunForTask(taskId: string) {
    const [run] = await this.database.select().from(schema.workflowRuns).where(eq(schema.workflowRuns.taskId, taskId)).orderBy(desc(schema.workflowRuns.createdAt)).limit(1);
    return run;
  }
}
