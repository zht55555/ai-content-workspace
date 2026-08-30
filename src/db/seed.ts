import "dotenv/config";

import { db, pool } from "./client";
import { users } from "./schema";

export const DEMO_USER_EMAIL = "demo@ai-content-workflow.local";

export async function seedDemoUser() {
  const [demoUser] = await db
    .insert(users)
    .values({ email: DEMO_USER_EMAIL, name: "Demo User" })
    .onConflictDoUpdate({ target: users.email, set: { name: "Demo User", updatedAt: new Date() } })
    .returning();

  return demoUser;
}

const isSeedCommand = process.argv[1]?.replaceAll("\\", "/").endsWith("/src/db/seed.ts");

if (isSeedCommand) {
  seedDemoUser()
    .then((user) => console.log(`Seeded Demo User: ${user.email}`))
    .catch((error: unknown) => {
      console.error("Failed to seed Demo User.", error);
      process.exitCode = 1;
    })
    .finally(() => pool.end());
}
