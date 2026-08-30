export class PromptNotFoundError extends Error {
  readonly code = "PROMPT_NOT_FOUND" as const;

  constructor(promptId: string, version?: number) {
    super(`Prompt ${promptId}${version === undefined ? "" : ` version ${version}`} was not found.`);
    this.name = "PromptNotFoundError";
  }
}

export class PromptBuildError extends Error {
  readonly code = "PROMPT_BUILD_ERROR" as const;

  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PromptBuildError";
  }
}
