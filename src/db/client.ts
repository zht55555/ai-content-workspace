import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://localhost:5432/ai_content_workflow";

const globalForDb = globalThis as typeof globalThis & {
  databasePool?: Pool;
};

const pool =
  globalForDb.databasePool ??
  new Pool({
    connectionString: databaseUrl,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.databasePool = pool;
}

export const db = drizzle(pool, { schema });
export { pool };
