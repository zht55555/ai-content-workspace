import { contentAnalysisPrompt } from "./content/content-analysis.prompt";
import { emotionAnalysisPrompt } from "./content/emotion-analysis.prompt";
import { hookAnalysisPrompt } from "./content/hook-analysis.prompt";
import { marketingContentPrompt } from "./content/marketing-content.prompt";
import { optimizationPrompt } from "./content/optimization.prompt";
import { scriptGenerationPrompt } from "./content/script-generation.prompt";
import { structureAnalysisPrompt } from "./content/structure-analysis.prompt";
import { PromptNotFoundError } from "./prompt.errors";
import type { RegisteredPrompt } from "./prompt.types";

const definitions = [
  contentAnalysisPrompt,
  emotionAnalysisPrompt,
  hookAnalysisPrompt,
  marketingContentPrompt,
  optimizationPrompt,
  scriptGenerationPrompt,
  structureAnalysisPrompt,
] as const;

type AnyPromptDefinition = (typeof definitions)[number];

function register(definition: AnyPromptDefinition): RegisteredPrompt {
  return {
    ...definition,
    buildUserPrompt: (input) => definition.buildUserPrompt(input as never),
    outputSchema: definition.outputSchema as RegisteredPrompt["outputSchema"],
  };
}

const registeredDefinitions: RegisteredPrompt[] = definitions.map(register);

export class PromptRegistry {
  constructor(private readonly prompts: readonly RegisteredPrompt[] = registeredDefinitions) {}

  get(id: string, version?: number): RegisteredPrompt {
    const prompt = this.prompts.find((candidate) => candidate.id === id && (version === undefined || candidate.version === version));
    if (!prompt) throw new PromptNotFoundError(id, version);
    return prompt;
  }

  list(): readonly RegisteredPrompt[] {
    return this.prompts;
  }
}

export const promptRegistry = new PromptRegistry();
