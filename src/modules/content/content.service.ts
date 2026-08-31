import { contentListQuerySchema, createContentSchema, updateContentSchema } from "./content.schema";
import { ContentRepository, ContentVersionRepository } from "./content.repository";
import { assertContentStatusTransition } from "./content.state";
import type { ContentStatus } from "./content.types";
import { ContentError } from "./content.errors";

export class ContentService {
  constructor(private readonly repository: Pick<ContentRepository, "findDemoUser" | "createWithOriginalVersion" | "findById" | "list" | "updateBasicInfo" | "updateStatus"> = new ContentRepository(), private readonly versionRepository: Pick<ContentVersionRepository, "findCurrentForContent"> = new ContentVersionRepository()) {}

  async createContent(input: unknown) {
    const data = createContentSchema.parse(input);
    const user = await this.repository.findDemoUser();
    if (!user) throw new Error("Demo User is not seeded.");
    return (await this.repository.createWithOriginalVersion({ ...data, userId: user.id })).content;
  }

  async listContents(input: unknown = {}) {
    const data = contentListQuerySchema.parse(input);
    const user = await this.repository.findDemoUser();
    if (!user) throw new Error("Demo User is not seeded.");
    const result = await this.repository.list({ ...data, userId: user.id, offset: (data.page - 1) * data.pageSize, limit: data.pageSize });
    return { ...result, page: data.page, pageSize: data.pageSize, totalPages: Math.ceil(result.total / data.pageSize) };
  }

  async getContent(contentItemId: string) {
    const user = await this.repository.findDemoUser();
    if (!user) throw new Error("Demo User is not seeded.");
    const content = await this.repository.findById(contentItemId, user.id);
    if (!content) throw new ContentError("CONTENT_NOT_FOUND", "ContentItem was not found.");
    return { ...content, currentVersion: await this.versionRepository.findCurrentForContent(content.id, content.currentVersionId) };
  }

  async updateContent(contentItemId: string, input: unknown) {
    const data = updateContentSchema.parse(input);
    const current = await this.getContent(contentItemId);
    if (current.status === "ARCHIVED") throw new ContentError("CONTENT_INVALID_STATE", "Archived content cannot be edited.");
    if (data.status === "ARCHIVED") return this.archiveContent(contentItemId);
    const { status, ...basicInfo } = data;
    void status;
    const updated = await this.repository.updateBasicInfo(contentItemId, basicInfo);
    if (!updated) throw new ContentError("CONTENT_NOT_FOUND", "ContentItem was not found.");
    return updated;
  }

  async archiveContent(contentItemId: string) {
    const current = await this.getContent(contentItemId);
    if (current.status === "ARCHIVED") return current;
    if (current.status === "AI_PROCESSING") throw new ContentError("CONTENT_INVALID_STATE", "ContentItem is currently processing.");
    assertContentStatusTransition(current.status, "ARCHIVED");
    const archived = await this.repository.updateStatus(contentItemId, "ARCHIVED");
    if (!archived) throw new ContentError("CONTENT_NOT_FOUND", "ContentItem was not found.");
    return archived;
  }

  async transitionStatus(contentItemId: string, currentStatus: ContentStatus, nextStatus: ContentStatus) {
    assertContentStatusTransition(currentStatus, nextStatus);
    return this.repository.updateStatus(contentItemId, nextStatus);
  }
}
