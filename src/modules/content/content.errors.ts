export type ContentErrorCode = "CONTENT_INVALID_STATE" | "VERSION_CONFLICT" | "CONTENT_NOT_FOUND" | "INVALID_REVIEW_STATE" | "NON_CURRENT_REVIEW_TARGET";

export class ContentError extends Error {
  constructor(readonly code: ContentErrorCode, message: string) {
    super(message);
    this.name = "ContentError";
  }
}

export class StaleVersionError extends ContentError {
  constructor(message = "Content version is stale.") {
    super("VERSION_CONFLICT", message);
    this.name = "StaleVersionError";
  }
}

export class InvalidReviewStateError extends ContentError {
  constructor(message = "ContentItem is not in a reviewable state.") {
    super("INVALID_REVIEW_STATE", message);
    this.name = "InvalidReviewStateError";
  }
}

export class NonCurrentReviewTargetError extends ContentError {
  constructor(message = "Review target is not the current ContentVersion.") {
    super("NON_CURRENT_REVIEW_TARGET", message);
    this.name = "NonCurrentReviewTargetError";
  }
}
