import { LLMProviderError } from "./llm-errors";
import type { LLMProvider, ProviderName } from "./llm-types";
import { DeepSeekProvider } from "./providers/deepseek-provider";
import { DemoProvider } from "./providers/demo-provider";

export type ProviderFactoryConfig = {
  provider?: ProviderName;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  demoDelayMs?: number;
};

export function getLLMProvider(config: ProviderFactoryConfig = {}): LLMProvider {
  const provider = config.provider ?? process.env.LLM_PROVIDER ?? "demo";
  if (provider === "demo") return new DemoProvider({ demoDelayMs: config.demoDelayMs ?? Number(process.env.DEMO_DELAY_MS ?? 0) });
  if (provider === "deepseek") {
    return new DeepSeekProvider({
      apiKey: config.apiKey ?? process.env.DEEPSEEK_API_KEY ?? "",
      baseUrl: config.baseUrl ?? process.env.DEEPSEEK_BASE_URL,
      model: config.model ?? process.env.DEEPSEEK_MODEL,
    });
  }
  throw new LLMProviderError("LLM_PROVIDER_ERROR", `Unsupported LLM provider: ${provider}.`, String(provider), false);
}
