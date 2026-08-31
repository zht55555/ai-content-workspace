import { z } from "zod";

import { ReviewRepository } from "./review.repository";
import { ContentError, NonCurrentReviewTargetError } from "@/src/modules/content/content.errors";

const createReviewSchema = z.object({
  contentItemId: z.string().uuid(),
  contentVersionId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  decision: z.enum(["APPROVED", "NEEDS_REVISION", "REJECTED"]),
  note: z.string().trim().max(5000).optional(),
});

export class ReviewService {
  constructor(private readonly repository: Pick<ReviewRepository, "findVersion" | "findCurrentVersionId" | "insert"> = new ReviewRepository()) {}

  async createReview(input: unknown) {
    const data = createReviewSchema.parse(input);
    const version = await this.repository.findVersion(data.contentVersionId);
    if (!version || version.contentItemId !== data.contentItemId) throw new ContentError("CONTENT_NOT_FOUND", "Content version was not found for this ContentItem.");
    const currentVersionId = await this.repository.findCurrentVersionId(data.contentItemId);
    if (!currentVersionId) throw new ContentError("CONTENT_NOT_FOUND", "Current ContentVersion was not found for this ContentItem.");
    if (currentVersionId !== version.id) throw new NonCurrentReviewTargetError();
    return this.repository.insert(data);
  }
}
