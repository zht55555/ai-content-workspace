import { z } from "zod";

import { ReviewRepository } from "./review.repository";
import { NonCurrentReviewTargetError } from "@/src/modules/content/content.errors";

const createReviewSchema = z.object({
  contentItemId: z.string().uuid(),
  contentVersionId: z.string().uuid(),
  reviewerId: z.string().uuid(),
  decision: z.enum(["APPROVED", "NEEDS_REVISION", "REJECTED"]),
  note: z.string().trim().max(5000).optional(),
});

export class ReviewService {
  constructor(private readonly repository: Pick<ReviewRepository, "findVersion" | "insert"> = new ReviewRepository()) {}

  async createReview(input: unknown) {
    const data = createReviewSchema.parse(input);
    const version = await this.repository.findVersion(data.contentVersionId);
    if (!version || version.contentItemId !== data.contentItemId) throw new NonCurrentReviewTargetError("Content version was not found for this ContentItem.");
    return this.repository.insert(data);
  }
}
