# Phase D Review, Version, and Script Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the human-in-the-loop loop from AI-generated ContentVersion through human editing, review, version history/compare, and safe regeneration.

**Architecture:** Keep ContentItem business state separate from Task/Workflow technical state. Extend the existing content version and review services with transactional operations, optimistic locking, append-only reviews, and regeneration through the existing ContentProcessingService. Add focused nested API routes and business sections inside the existing Content Detail.

**Tech Stack:** Next.js App Router, React, TypeScript, Zod, Drizzle ORM/PostgreSQL, Vitest, existing WorkflowEngine/Snapshot/SSE.

**Spec:** `docs/superpowers/specs/2026-08-31-ai-content-workspace-2-design.md`

## Global Constraints

- ContentVersion stores only schemaVersion, script, titles, coverCopy, publishCopy, and keywords.
- Analysis, Hook, Structure, Emotion, and Optimization remain read-only AnalysisResult data.
- Human edits append `HUMAN_EDIT`; regeneration appends `AI_REGENERATED`; old versions are never overwritten.
- Review references one concrete ContentVersion and stores decision plus note; no ReviewComment.
- Regenerate reuses Task/Workflow/LLM/Structured Output/SSE and restores status/currentVersionId atomically on failure.
- Do not implement Dashboard, publishing, RAG, MCP, Tool Calling, Multi-Agent, OAuth, multi-tenancy, crawlers, uploads, or collaboration.
- Use private Git identity `zht <764659983@qq.com>`.

---

### Task 1: Domain contracts and failing tests

**Files:** Modify `src/modules/content/content.errors.ts`, `src/modules/content/content.types.ts`, `src/db/types.ts`; test `tests/content/content-version.service.test.ts`, `tests/review/review.service.test.ts`.

**Interfaces:** Add typed errors for stale versions, invalid review state, and non-current review targets; export DTO types used by API/UI.

- [ ] Write tests proving stale human edits and reviews of another/old version are rejected.
- [ ] Run `npm test -- --run tests/content/content-version.service.test.ts tests/review/review.service.test.ts`; verify expected red failures.
- [ ] Add the minimal error/type contracts and rerun focused tests.
- [ ] Commit with `git add ... && git commit -m "test: define phase d version and review contracts"`.

### Task 2: Transactional human edits, history, and compare

**Files:** Modify `src/modules/content/content.repository.ts`, `src/modules/content/content-version.service.ts`; create `src/modules/content/content-version.schema.ts`, `tests/content/content-version.integration.test.ts`; modify `tests/content/content-version.service.test.ts`.

**Interfaces:**
- `createHumanEdit({ contentItemId, baseVersionId, createdBy, payload }): Promise<ContentVersionRecord>`
- `listVersions(contentItemId): Promise<ContentVersionRecord[]>`
- `getVersion(contentItemId, versionId): Promise<ContentVersionRecord>`
- `compareVersions(contentItemId, leftVersionId, rightVersionId): Promise<{ fields: Record<"script" | "titles" | "coverCopy" | "publishCopy" | "keywords", { before: unknown; after: unknown; changed: boolean }> }>`

- [ ] Write tests for HUMAN_EDIT, incremented versionNumber, baseVersionId, deliverable-only payload, currentVersionId update, old-version preservation, and transaction conflict.
- [ ] Run focused tests and verify they fail because behavior is missing.
- [ ] Implement schema validation, transactional current-version check/update, version insertion, history query, ownership checks, and direct five-field compare.
- [ ] Run focused tests and `npm test -- --run`; commit `feat: add human edit version history and compare`.

### Task 3: Append-only Review decisions

**Files:** Modify `src/modules/review/review.repository.ts`, `src/modules/review/review.service.ts`, `src/modules/content/content.repository.ts`; create `tests/review/review.integration.test.ts`; modify `tests/review/review.service.test.ts`.

**Interfaces:** `createReview(input): Promise<ReviewRecord>` and `listReviews(contentItemId): Promise<ReviewRecord[]>`; approve finalizes exactly the reviewed version and sets APPROVED; request revision/reject append a review and set NEEDS_REVISION/REJECTED without replacing currentVersionId.

- [ ] Write tests for all decisions, notes, append-only history, current-version validation, final flag uniqueness, and old-version protection.
- [ ] Run focused tests and verify red.
- [ ] Implement repository transactions: insert Review, update status, and for approval clear prior final flags then mark the reviewed version final.
- [ ] Run review tests and all tests; commit `feat: add content version review decisions`.

### Task 4: Version, Review, and Regenerate APIs

**Files:** Create `app/api/contents/[contentId]/versions/route.ts`, `app/api/contents/[contentId]/versions/[versionId]/route.ts`, `app/api/contents/[contentId]/versions/[versionId]/compare/route.ts`, `app/api/contents/[contentId]/reviews/route.ts`; modify `app/api/contents/[contentId]/processing/route.ts`, `src/lib/api/contents.ts`; create API tests.

**Interfaces:** GET/POST versions, GET version, GET compare with `withVersionId`, GET/POST reviews, and existing POST processing for regeneration in WAITING_REVIEW/NEEDS_REVISION.

- [ ] Write route tests for success, 400 malformed input, 404 ownership, 409 stale edit, and regeneration state restrictions.
- [ ] Run focused API tests and verify red.
- [ ] Implement routes using Zod, services, Demo User convention, and ContentError-to-HTTP mapping; keep SQL out of handlers.
- [ ] Add typed client helpers, run API/full tests, and commit `feat: expose version review and regenerate APIs`.

### Task 5: Content Detail business UI

**Files:** Modify `app/contents/[contentId]/page.tsx`, `src/components/content/content-detail.tsx`, `tests/content/content-pages.test.tsx`; create `src/components/content/script-studio.tsx`, `src/components/content/version-history.tsx`, `src/components/content/review-panel.tsx`, `src/components/content/analysis-panel.tsx`, and focused UI tests.

**Interfaces:** Script Studio submits `{ baseVersionId, payload }`; history shows number/source/createdAt/createdBy/current/final; compare shows Before/After for five deliverables; Review submits version/decision/note and shows history; Analysis displays read-only AnalysisResult fields.

- [ ] Write failing component tests for controls, read-only analysis, baseVersionId submission, review actions, history/compare, 409 messaging, and loading/empty/error/success states.
- [ ] Run UI tests and verify red.
- [ ] Implement focused child components and compose them into Content Detail; preserve WorkflowTimeline only under Execution Detail and reuse existing Snapshot/SSE.
- [ ] Run UI/full tests; commit `feat: add script studio review and version history`.

### Task 6: Regenerate success/failure and refresh integration

**Files:** Modify `src/modules/content/content-processing.service.ts`, `src/modules/content/content.repository.ts`, processing tests; create `tests/content/phase-d.integration.test.ts`.

- [ ] Write failing tests for WAITING_REVIEW/NEEDS_REVISION regenerate success (`AI_REGENERATED`, baseVersionId, WAITING_REVIEW), exact failure restoration, preserved current version, page refresh snapshot, and SSE terminal sync.
- [ ] Run focused tests and verify red.
- [ ] Extend only the existing processing path to select source/base version and preserve prior state; do not rewrite WorkflowEngine/LLM/Structured Output/SSE.
- [ ] Run focused and full tests; commit `feat: support safe content regeneration`.

### Task 7: Verification, browser smoke, and push

**Files:** Only verification-fix files if needed.

- [ ] Run `npm run lint`, `npm run typecheck`, `npm test -- --run`, `npm run build`, and `npx drizzle-kit check`; resolve failures before completion claims.
- [ ] Browser-smoke create/use an exact test item, verify edit/review/history/compare/regenerate/refresh, then remove/archive only that item.
- [ ] Run `git diff --check`, inspect status/diff, verify private identity, and ensure no secrets/unrelated phase work.
- [ ] Push `codex/phase-d-review-version` with `git push -u origin codex/phase-d-review-version`.
- [ ] Stop after this phase; do not merge or start Dashboard without explicit instruction.

## Self-Review

The tasks cover human edit, version history, compare, Review decisions/final flag/history, Regenerate success/failure, VERSION_CONFLICT, page refresh, SSE, and all requested verification. Analysis fields remain read-only and Review never binds WorkflowRun or AnalysisResult.
