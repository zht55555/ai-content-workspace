import { z } from "zod";

import { ContentDeliverableSchema } from "./content.schema";

export const CONTENT_VERSION_COMPARE_FIELDS = ["script", "titles", "coverCopy", "publishCopy", "keywords"] as const;

export const CreateHumanEditSchema = z.object({
  contentItemId: z.string().uuid(),
  baseVersionId: z.string().uuid(),
  createdBy: z.string().uuid(),
  payload: ContentDeliverableSchema,
}).strict();

export const VersionCompareFieldSchema = z.object({
  before: z.unknown(),
  after: z.unknown(),
  changed: z.boolean(),
});

export const CompareVersionsResultSchema = z.object({
  fields: z.object({
    script: VersionCompareFieldSchema,
    titles: VersionCompareFieldSchema,
    coverCopy: VersionCompareFieldSchema,
    publishCopy: VersionCompareFieldSchema,
    keywords: VersionCompareFieldSchema,
  }),
});

export type CreateHumanEditInput = z.infer<typeof CreateHumanEditSchema>;
export type CompareVersionsResult = z.infer<typeof CompareVersionsResultSchema>;
