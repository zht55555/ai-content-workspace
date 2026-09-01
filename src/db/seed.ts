import "dotenv/config";

import { db, pool } from "./client";
import { eq } from "drizzle-orm";
import { contentItems, contentVersions, users } from "./schema";
import { ContentRepository } from "@/src/modules/content/content.repository";

export const DEMO_USER_EMAIL = "demo@ai-content-workflow.local";

export async function seedDemoUser() {
  const [demoUser] = await db
    .insert(users)
    .values({ email: DEMO_USER_EMAIL, name: "Demo User" })
    .onConflictDoUpdate({ target: users.email, set: { name: "Demo User", updatedAt: new Date() } })
    .returning();

  return demoUser;
}

export async function seedDemoContent(userId: string) {
  const repository = new ContentRepository();
  const samples: Array<[string, string, "DRAFT" | "WAITING_REVIEW" | "NEEDS_REVISION" | "APPROVED"]> = [
    ["Demo · 春季新品选题", "春季新品的内容素材。", "DRAFT" as const],
    ["Demo · 三分钟效率方法", "分享一个提升效率的方法。", "WAITING_REVIEW" as const],
    ["Demo · 用户故事复盘", "一个用户故事和复盘记录。", "NEEDS_REVISION" as const],
    ["Demo · 品牌幕后故事", "品牌幕后制作故事。", "APPROVED" as const],
  ];
  for (const [title, rawContent, status] of samples) {
    const existing = await db.select({ id: contentItems.id }).from(contentItems).where(eq(contentItems.title, title));
    if (existing[0]) continue;
    const created = await repository.createWithOriginalVersion({ userId, title, rawContent, platform: "DOUYIN", source: "Demo Seed", tags: ["demo"] });
    await db.update(contentItems).set({ status }).where(eq(contentItems.id, created.content.id));
    if (status === "APPROVED") await db.update(contentVersions).set({ isFinal: true }).where(eq(contentVersions.id, created.originalVersion.id));
  }
}

const isSeedCommand = process.argv[1]?.replaceAll("\\", "/").endsWith("/src/db/seed.ts");

if (isSeedCommand) {
  seedDemoUser()
    .then(async (user) => { await seedDemoContent(user.id); console.log(`Seeded Demo User and sample content: ${user.email}`); })
    .catch((error: unknown) => {
      console.error("Failed to seed Demo User.", error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
