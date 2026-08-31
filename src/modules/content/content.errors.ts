export class ContentError extends Error {
  constructor(readonly code: "CONTENT_INVALID_STATE" | "VERSION_CONFLICT" | "CONTENT_NOT_FOUND", message: string) {
    super(message);
    this.name = "ContentError";
  }
}
