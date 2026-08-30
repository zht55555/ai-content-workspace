import type { ZodType } from "zod";

export type ContentPromptInput = {
  inputType: "TRANSCRIPT" | "COPY" | "TOPIC";
  content: string;
};

export type PromptDefinition<TInput, TOutput> = {
  id: string;
  version: number;
  name: string;
  systemPrompt: string;
  buildUserPrompt(input: TInput): string;
  outputSchema: ZodType<TOutput>;
};

export type RegisteredPrompt = {
  id: string;
  version: number;
  name: string;
  systemPrompt: string;
  buildUserPrompt(input: unknown): string;
  outputSchema: ZodType<unknown>;
};
