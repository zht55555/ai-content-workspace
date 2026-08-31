import { z } from "zod";

import { CONTENT_PLATFORMS, CONTENT_STATUSES } from "./content.types";

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
  userId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(200),
  rawContent: z.string().trim().min(1).max(100_000),
  platform: z.enum(CONTENT_PLATFORMS).default("OTHER"),
  source: z.string().trim().max(200).optional(),
  sourceUrl: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).default([]),
});

export const contentListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  platform: z.enum(CONTENT_PLATFORMS).optional(),
  status: z.enum(CONTENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const updateContentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  rawContent: z.string().trim().min(1).max(100_000).optional(),
  platform: z.enum(CONTENT_PLATFORMS).optional(),
  source: z.string().trim().max(200).optional(),
  sourceUrl: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(50).optional(),
  status: z.literal("ARCHIVED").optional(),
}).strict();
