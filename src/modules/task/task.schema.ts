import { z } from "zod";

import { TASK_TYPES } from "./task.types";

const typeToInputType = {
  TRANSCRIPT_ANALYSIS: "TRANSCRIPT",
  COPY_ANALYSIS: "COPY",
  TOPIC_ANALYSIS: "TOPIC",
} as const;

export const createTaskInputSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    type: z.enum(TASK_TYPES),
    input: z.object({
      inputType: z.enum(["TRANSCRIPT", "COPY", "TOPIC"]),
      content: z.string().trim().min(1).max(100_000),
      metadata: z.record(z.string(), z.unknown()).default({}),
    }),
  })
  .superRefine((value, context) => {
    if (typeToInputType[value.type] !== value.input.inputType) {
      context.addIssue({ code: "custom", path: ["input", "inputType"], message: "Input type must match task type." });
    }
  });

export const updateTaskSchema = z.object({ title: z.string().trim().min(1).max(200).optional() }).strict();

export const updateTaskStatusSchema = z.object({ status: z.enum(["DRAFT", "QUEUED", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]) });

export const listTaskQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: updateTaskStatusSchema.shape.status.optional(),
  type: z.enum(TASK_TYPES).optional(),
});
