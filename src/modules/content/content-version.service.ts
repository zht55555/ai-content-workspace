import { ContentError, StaleVersionError } from "./content.errors";
import { ContentVersionRepository } from "./content.repository";
import type { ContentVersionSource } from "./content.types";
import { CompareVersionsResultSchema, CONTENT_VERSION_COMPARE_FIELDS, CreateHumanEditSchema, type CompareVersionsResult } from "./content-version.schema";

export class ContentVersionService {
  constructor(private readonly repository: Pick<ContentVersionRepository, "createHumanEdit" | "findByIdForContent" | "findLatestForContent" | "insert" | "listVersions"> = new ContentVersionRepository()) {}

  async createVersion(input: { contentItemId: string; createdBy: string; source: ContentVersionSource; baseVersionId?: string; workflowRunId?: string; analysisResultId?: string; payload: unknown }) {
    const payload = CreateHumanEditSchema.shape.payload.parse(input.payload);
    const latest = await this.repository.findLatestForContent(input.contentItemId);
    if (input.baseVersionId && latest?.id !== input.baseVersionId) throw new StaleVersionError();
    const version = await this.repository.insert({ contentItemId: input.contentItemId, versionNumber: (latest?.versionNumber ?? 0) + 1, source: input.source, createdBy: input.createdBy, baseVersionId: input.baseVersionId, workflowRunId: input.workflowRunId, analysisResultId: input.analysisResultId, contentJson: payload });
    return version;
  }

  async createHumanEdit(input: { contentItemId: string; baseVersionId: string; createdBy: string; payload: unknown }) {
    const parsed = CreateHumanEditSchema.parse(input);
    return this.repository.createHumanEdit(parsed);
  }

  async listVersions(contentItemId: string) {
    return this.repository.listVersions(contentItemId);
  }

  async getVersion(contentItemId: string, versionId: string) {
    const version = await this.repository.findByIdForContent(contentItemId, versionId);
    if (!version) throw new ContentError("CONTENT_NOT_FOUND", "Content version was not found for this ContentItem.");
    return version;
  }

  async compareVersions(contentItemId: string, leftVersionId: string, rightVersionId: string): Promise<CompareVersionsResult> {
    const [left, right] = await Promise.all([
      this.getVersion(contentItemId, leftVersionId),
      this.getVersion(contentItemId, rightVersionId),
    ]);

    const leftContent = CreateHumanEditSchema.shape.payload.parse(left.contentJson);
    const rightContent = CreateHumanEditSchema.shape.payload.parse(right.contentJson);

    const comparison = CompareVersionsResultSchema.parse({
      fields: Object.fromEntries(CONTENT_VERSION_COMPARE_FIELDS.map((field) => {
        const before = leftContent[field];
        const after = rightContent[field];
        return [field, { before, after, changed: JSON.stringify(before) !== JSON.stringify(after) }];
      })),
    });

    return comparison;
  }
}
