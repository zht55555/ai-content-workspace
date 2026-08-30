import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db, pool } from "@/src/db/client";
import { DEMO_USER_EMAIL, seedDemoUser } from "@/src/db/seed";
import { users } from "@/src/db/schema";

const runIntegrationTests = Boolean(process.env.DATABASE_URL);

describe.skipIf(!runIntegrationTests)("Demo User seed", () => {
  afterAll(async () => {
    await pool.end();
  });

  it("creates one Demo User and is idempotent", async () => {
    await seedDemoUser();
    await seedDemoUser();

    const demoUsers = await db.select().from(users).where(eq(users.email, DEMO_USER_EMAIL));
    expect(demoUsers).toHaveLength(1);
    expect(demoUsers[0]?.name).toBe("Demo User");
  });
});
