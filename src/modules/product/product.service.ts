import { z } from "zod";
import { ContentRepository } from "@/src/modules/content/content.repository";
import { ProductRepository } from "./product.repository";

const reviewCenterQuerySchema = z.object({ status: z.enum(["WAITING_REVIEW", "NEEDS_REVISION", "APPROVED", "REJECTED"]).optional() });

export class ProductService {
  constructor(private readonly contentRepository: Pick<ContentRepository, "findDemoUser"> = new ContentRepository(), private readonly productRepository: ProductRepository = new ProductRepository()) {}

  private async userId() {
    const user = await this.contentRepository.findDemoUser();
    if (!user) throw new Error("Demo User is not seeded.");
    return user.id;
  }

  async dashboard() { return this.productRepository.getDashboard(await this.userId()); }
  async reviewCenter(input: unknown = {}) { return this.productRepository.listReviewCenter(await this.userId(), reviewCenterQuerySchema.parse(input).status); }
}
