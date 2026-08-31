import { createContentSchema } from "./content.schema";
import { ContentRepository } from "./content.repository";
import { assertContentStatusTransition } from "./content.state";
import type { ContentStatus } from "./content.types";

export class ContentService {
  constructor(private readonly repository: Pick<ContentRepository, "insertContent" | "updateStatus"> = new ContentRepository()) {}

  async createContent(input: unknown) {
    const data = createContentSchema.parse(input);
    return this.repository.insertContent(data);
  }

  async transitionStatus(contentItemId: string, currentStatus: ContentStatus, nextStatus: ContentStatus) {
    assertContentStatusTransition(currentStatus, nextStatus);
    return this.repository.updateStatus(contentItemId, nextStatus);
  }
}
