import { and, count, desc, eq } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres/session";
import { PgTransaction } from "drizzle-orm/pg-core";

import * as schema from "@/src/db/schema";
import { db } from "@/src/db/client";
import type { InputType, TaskType } from "./task.types";

export type TaskDb =
  | NodePgDatabase<typeof schema>
  | PgTransaction<NodePgQueryResultHKT, typeof schema>;

const typeToContentType: Record<TaskType, "TRANSCRIPT" | "COPY" | "TOPIC"> = {
  TRANSCRIPT_ANALYSIS: "TRANSCRIPT",
  COPY_ANALYSIS: "COPY",
  TOPIC_ANALYSIS: "TOPIC",
};

export class TaskRepository {
  constructor(private readonly database: TaskDb = db) {}

  async findDemoUser() {
    const result = await this.database.select().from(schema.users).where(eq(schema.users.email, "demo@ai-content-workflow.local"));
    return result[0];
  }

  async insertTask(database: TaskDb, userId: string, title: string, type: TaskType, contentItemId?: string) {
    const [task] = await database
      .insert(schema.tasks)
      .values({ userId, contentItemId, name: title, contentType: typeToContentType[type], status: "DRAFT" })
      .returning();
    return task;
  }

  async insertTaskInput(database: TaskDb, taskId: string, input: { inputType: InputType; content: string; metadata: Record<string, unknown> }) {
    const [taskInput] = await database
      .insert(schema.taskInputs)
      .values({ taskId, rawContent: input.content, contentType: input.inputType, metadata: input.metadata })
      .returning();
    return taskInput;
  }

  async findById(taskId: string) {
    const result = await this.database
      .select({ task: schema.tasks, input: schema.taskInputs, user: schema.users })
      .from(schema.tasks)
      .innerJoin(schema.taskInputs, eq(schema.taskInputs.taskId, schema.tasks.id))
      .innerJoin(schema.users, eq(schema.users.id, schema.tasks.userId))
      .where(eq(schema.tasks.id, taskId));
    return result[0];
  }

  async findLatestForContent(contentItemId: string, userId: string) {
    const [task] = await this.database.select({ id: schema.tasks.id }).from(schema.tasks).where(and(eq(schema.tasks.contentItemId, contentItemId), eq(schema.tasks.userId, userId))).orderBy(desc(schema.tasks.createdAt)).limit(1);
    return task ? this.findById(task.id) : undefined;
  }

  async list(options: { userId: string; offset: number; limit: number; status?: schema.TaskStatus; contentType?: "TRANSCRIPT" | "COPY" | "TOPIC" }) {
    const filters = [eq(schema.tasks.userId, options.userId)];
    if (options.status) filters.push(eq(schema.tasks.status, options.status));
    if (options.contentType) filters.push(eq(schema.tasks.contentType, options.contentType));
    const where = and(...filters);
    const [items, totalResult] = await Promise.all([
      this.database.select().from(schema.tasks).where(where).orderBy(desc(schema.tasks.createdAt)).limit(options.limit).offset(options.offset),
      this.database.select({ total: count() }).from(schema.tasks).where(where),
    ]);
    return { items, total: Number(totalResult[0]?.total ?? 0) };
  }

  async updateTitle(taskId: string, title: string) {
    const [task] = await this.database.update(schema.tasks).set({ name: title, updatedAt: new Date() }).where(eq(schema.tasks.id, taskId)).returning();
    return task;
  }

  async updateStatus(taskId: string, status: schema.TaskStatus) {
    const [task] = await this.database.update(schema.tasks).set({ status, updatedAt: new Date() }).where(eq(schema.tasks.id, taskId)).returning();
    return task;
  }

  async delete(taskId: string) {
    const deleted = await this.database.delete(schema.tasks).where(eq(schema.tasks.id, taskId)).returning({ id: schema.tasks.id });
    return deleted.length > 0;
  }
}
