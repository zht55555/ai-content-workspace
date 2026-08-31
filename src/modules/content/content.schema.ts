import { z } from "zod";

import { CONTENT_PLATFORMS } from "./content.types";

export const ContentDeliverableSchema = z.object({
  schemaVersion: z.literal("content-deliverable.v1"),
  script: z.string(),
  titles: z.array(z.string()),
  coverCopy: z.array(z.string()),
  publishCopy: z.string(),
  keywords: z.array(z.string()),
}).strict();

export type ContentDeliverable = z.infer<typeof ContentDeliverableSchema>;

export const createContentSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  rawContent: z.string().trim().min(1).max(100_000),
  platform: z.enum(CONTENT_PLATFORMS).default("OTHER"),
  source: z.string().trim().max(200).optional(),
  sourceUrl: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).default([]),
});
