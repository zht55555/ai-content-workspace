import { db } from "@/src/db/client";
import { TaskError } from "./task.errors";
import { TaskRepository } from "./task.repository";
import { assertTaskStatusTransition } from "./task.state";
import { createTaskInputSchema, listTaskQuerySchema, updateTaskSchema, updateTaskStatusSchema } from "./task.schema";
import type { TaskType } from "./task.types";

const typeToContentType: Record<TaskType, "TRANSCRIPT" | "COPY" | "TOPIC"> = {
  TRANSCRIPT_ANALYSIS: "TRANSCRIPT",
  COPY_ANALYSIS: "COPY",
  TOPIC_ANALYSIS: "TOPIC",
};

function toTaskView(row: NonNullable<Awaited<ReturnType<TaskRepository["findById"]>>>) {
  return {
    id: row.task.id,
    userId: row.task.userId,
    title: row.task.name,
    type: `${row.task.contentType}_ANALYSIS` as TaskType,
    status: row.task.status,
    createdAt: row.task.createdAt,
    updatedAt: row.task.updatedAt,
    completedAt: row.task.completedAt,
    lastError: row.task.lastError,
    input: {
      id: row.input.id,
      taskId: row.input.taskId,
      inputType: row.input.contentType,
      content: row.input.rawContent,
      metadata: row.input.metadata as Record<string, unknown>,
      createdAt: row.input.createdAt,
      updatedAt: row.input.updatedAt,
    },
    user: { id: row.user.id, email: row.user.email, name: row.user.name },
  };
}

export class TaskService {
  private readonly repository: TaskRepository;

  constructor(repository = new TaskRepository()) {
    this.repository = repository;
  }

  async createTask(input: unknown) {
    const data = createTaskInputSchema.parse(input);
    const demoUser = await this.repository.findDemoUser();
    if (!demoUser) throw new Error("Demo User is not seeded.");

    const taskId = await db.transaction(async (transaction) => {
      const task = await this.repository.insertTask(transaction, demoUser.id, data.title, data.type);
      if (!task) throw new Error("Task creation failed.");
      await this.repository.insertTaskInput(transaction, task.id, data.input);
      return task.id;
    });

    return this.getTask(taskId);
  }

  async listTasks(query: unknown = {}) {
    const options = listTaskQuerySchema.parse(query);
    const demoUser = await this.repository.findDemoUser();
    if (!demoUser) throw new Error("Demo User is not seeded.");
    const result = await this.repository.list({
      userId: demoUser.id,
      offset: (options.page - 1) * options.pageSize,
      limit: options.pageSize,
      status: options.status,
      contentType: options.type ? typeToContentType[options.type] : undefined,
    });
    return {
      items: result.items.map((task) => ({ ...task, title: task.name, type: `${task.contentType}_ANALYSIS` as TaskType })),
      page: options.page,
      pageSize: options.pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / options.pageSize),
    };
  }

  async getTask(taskId: string) {
    const task = await this.repository.findById(taskId);
    if (!task) throw new TaskError("TASK_NOT_FOUND", "Task not found.");
    return toTaskView(task);
  }

  async updateTask(taskId: string, input: unknown) {
    const data = updateTaskSchema.parse(input);
    const current = await this.getTask(taskId);
    if (data.title) await this.repository.updateTitle(taskId, data.title);
    return this.getTask(current.id);
  }

  async updateTaskStatus(taskId: string, input: unknown) {
    const { status } = updateTaskStatusSchema.parse(input);
    const current = await this.getTask(taskId);
    assertTaskStatusTransition(current.status, status);
    await this.repository.updateStatus(taskId, status);
    return this.getTask(taskId);
  }

  async deleteTask(taskId: string) {
    await this.getTask(taskId);
    await this.repository.delete(taskId);
  }
}
