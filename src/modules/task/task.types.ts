import type { InferSelectModel } from "drizzle-orm";

import type { tasks, taskInputs, users } from "@/src/db/schema";

export const TASK_TYPES = ["TRANSCRIPT_ANALYSIS", "COPY_ANALYSIS", "TOPIC_ANALYSIS"] as const;
export type TaskType = (typeof TASK_TYPES)[number];
export type InputType = "TRANSCRIPT" | "COPY" | "TOPIC";
export type TaskStatus = InferSelectModel<typeof tasks>["status"];
export type TaskRecord = InferSelectModel<typeof tasks>;
export type TaskInputRecord = InferSelectModel<typeof taskInputs>;
export type UserRecord = InferSelectModel<typeof users>;

export type TaskView = {
  id: string;
  userId: string;
  contentItemId: string | null;
  title: string;
  type: TaskType;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  lastError: string | null;
  input: {
    id: string;
    taskId: string;
    inputType: InputType;
    content: string;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
  };
  user: { id: string; email: string; name: string };
};
