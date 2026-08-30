import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  LLM_PROVIDER: z.enum(["demo", "deepseek"]).default("demo"),
  DEEPSEEK_API_KEY: z.string().min(1).optional(),
  DEEPSEEK_MODEL: z.string().min(1).default("deepseek-chat"),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  LLM_PROVIDER: process.env.LLM_PROVIDER,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_MODEL: process.env.DEEPSEEK_MODEL,
});
