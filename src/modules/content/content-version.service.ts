import { db } from "@/src/db/client";
import { StaleVersionError } from "./content.errors";
import { ContentDeliverableSchema } from "./content.schema";
import { ContentVersionRepository } from "./content.repository";
import type { ContentVersionSource } from "./content.types";

export class ContentVersionService {
  constructor(private readonly repository: Pick<ContentVersionRepository, "findLatestForContent" | "insert"> = new ContentVersionRepository(), private readonly database = db) {}

  async createVersion(input: { contentItemId: string; createdBy: string; source: ContentVersionSource; baseVersionId?: string; workflowRunId?: string; analysisResultId?: string; payload: unknown }) {
    const payload = ContentDeliverableSchema.parse(input.payload);
    const latest = await this.repository.findLatestForContent(input.contentItemId);
    if (input.baseVersionId && latest?.id !== input.baseVersionId) throw new StaleVersionError();
    const version = await this.repository.insert({ contentItemId: input.contentItemId, versionNumber: (latest?.versionNumber ?? 0) + 1, source: input.source, createdBy: input.createdBy, baseVersionId: input.baseVersionId, workflowRunId: input.workflowRunId, analysisResultId: input.analysisResultId, contentJson: payload });
    return version;
  }
}
