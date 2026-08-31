# Phase A Domain Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the persisted ContentItem, ContentVersion, and Review domain foundations, business status rules, and Task association without changing the existing Workflow, LLM, Structured Output, SSE, or UI responsibilities.

**Architecture:** Add a business-domain layer beside the existing execution-domain layer. ContentItem owns business status and raw content; Task remains one AI execution intent and gains `contentItemId`; AnalysisResult remains AI analysis output; ContentVersion stores only the editable/publishable deliverable; Review stores a decision and note for one concrete version. Repository and service methods follow the existing Task module patterns.

**Tech Stack:** Next.js, TypeScript strict, Zod, PostgreSQL, Drizzle ORM, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-ai-content-workspace-2-design.md`

## Global Constraints

- Implement Phase A only: domain model and status foundation.
- Do not implement Content Library, Review Center, Dashboard, or major UI changes.
- Preserve existing Task, WorkflowRun, WorkflowStep, WorkflowEngine, LLM Provider, StructuredGenerationService, Prompt Registry, AnalysisResult, and SSE core responsibilities.
- ContentVersion stores only Script, Titles, Cover Copy, Publish Copy, and Keywords; Analysis, Hook, Structure, Emotion, and Optimization remain AnalysisResult data.
- Review stores `decision` and `note`; do not add ReviewComment.
- PostgreSQL remains the source of truth for ContentItem, ContentVersion, and Review state.
- Every production behavior change starts with a failing test and is verified through the red-green-refactor loop.

---

### Task 1: Business domain contracts and state rules

**Files:**
- Create: `src/modules/content/content.types.ts`
- Create: `src/modules/content/content.schema.ts`
- Create: `src/modules/content/content.state.ts`
- Create: `src/modules/content/content.errors.ts`
- Create: `tests/content/content-schema.test.ts`
- Create: `tests/content/content-state.test.ts`

**Interfaces:**
- Produces `CONTENT_PLATFORMS`, `CONTENT_STATUSES`, `CONTENT_VERSION_SOURCES`, `REVIEW_DECISIONS`.
- Produces `ContentDeliverableSchema` and `contentVersionPayloadSchema` for the deliverable-only payload.
- Produces `assertContentStatusTransition(from, to, context)` and helpers for first processing versus regeneration failure restoration.

- [ ] **Step 1: Write failing schema tests**

Test that a valid payload accepts exactly `schemaVersion`, `script`, `titles`, `coverCopy`, `publishCopy`, and `keywords`, and that analysis-only keys such as `analysis` and `hook` are rejected.

- [ ] **Step 2: Run schema tests and verify the expected missing-module failure**

Run: `npm test -- tests/content/content-schema.test.ts`

Expected: FAIL because the new content schema module does not exist.

- [ ] **Step 3: Write failing state tests**

Test valid transitions, invalid transitions, first-processing failure restoration to `DRAFT`, and regeneration failure restoration to the saved pre-processing status.

- [ ] **Step 4: Run state tests and verify the expected missing-module failure**

Run: `npm test -- tests/content/content-state.test.ts`

Expected: FAIL because the new state module does not exist.

- [ ] **Step 5: Implement the minimal types, schemas, errors, and state table**

Use the design document's exact enums. Keep `ContentStatus` separate from `TaskStatus` and `WorkflowRunStatus`. Make regeneration restoration accept only `WAITING_REVIEW` or `NEEDS_REVISION` as a prior state.

- [ ] **Step 6: Run both focused tests and verify they pass**

Run: `npm test -- tests/content/content-schema.test.ts tests/content/content-state.test.ts`

Expected: PASS with all assertions green.

### Task 2: Database schema and migration contract

**Files:**
- Modify: `src/db/schema.ts`
- Modify: `src/db/types.ts`
- Modify: `tests/db/schema-contract.test.ts`
- Create: `drizzle/0005_polite_magus.sql`
- Modify: `drizzle/meta/_journal.json` and generated snapshot files through Drizzle tooling

**Interfaces:**
- Produces `contentItems`, `contentVersions`, and `reviews` Drizzle tables.
- Produces `contentPlatformEnum`, `contentStatusEnum`, `contentVersionSourceEnum`, and `reviewDecisionEnum`.
- Adds nullable `contentItemId` to `tasks` during the foundation phase so existing rows remain migratable.

- [ ] **Step 1: Add failing schema contract assertions**

Assert that the four enums, three new tables, Task's `contentItemId`, ContentVersion's unique `(contentItemId, versionNumber)` constraint, and Review's `contentVersionId` relation are exported.

- [ ] **Step 2: Run the contract test and verify it fails for missing exports**

Run: `npm test -- tests/db/schema-contract.test.ts`

Expected: FAIL on the new table/enum assertions.

- [ ] **Step 3: Implement the Drizzle schema**

Define ContentItem, ContentVersion, and Review with foreign keys, indexes, and the partial unique final-version index. Keep ContentVersion `contentJson` typed as JSON at the database boundary; service validation owns the Zod contract.

- [ ] **Step 4: Run the contract test and typecheck**

Run: `npm test -- tests/db/schema-contract.test.ts && npm run typecheck`

Expected: PASS with no TypeScript errors.

- [ ] **Step 5: Generate the Drizzle migration and inspect it**

Run: `npm run db:generate`

Inspect the generated SQL for the four enums, three tables, foreign keys, indexes, and nullable Task association. Do not execute the migration against a database in this task.

- [ ] **Step 6: Run the Drizzle migration consistency check**

Run: `npm run db:check`

Expected: PASS.

### Task 3: ContentItem, ContentVersion, and Review repositories/services

**Files:**
- Create: `src/modules/content/content.repository.ts`
- Create: `src/modules/content/content.service.ts`
- Create: `src/modules/content/content-version.repository.ts`
- Create: `src/modules/content/content-version.service.ts`
- Create: `src/modules/review/review.repository.ts`
- Create: `src/modules/review/review.service.ts`
- Create: `tests/content/content.service.test.ts`
- Create: `tests/content/content-version.service.test.ts`
- Create: `tests/review/review.service.test.ts`

**Interfaces:**
- `ContentService.createContent(input)` creates the ContentItem and stores raw material only; Deliverable versions are created separately by `ContentVersionService`.
- `ContentVersionService.createHumanEdit(...)` validates `baseVersionId`, allocates the next version number, and stores only the deliverable payload.
- `ReviewService.createReview(...)` verifies the version belongs to the content, then persists reviewer, decision, note, and version ID.

- [ ] **Step 1: Write failing service tests using injected repository/database fakes**

Cover atomic Original Version creation, deliverable-only version validation, version number allocation, version conflict rejection, and Review rejection when the version belongs to another ContentItem.

- [ ] **Step 2: Run the service tests and verify they fail before implementation**

Run: `npm test -- tests/content/content.service.test.ts tests/content/content-version.service.test.ts tests/review/review.service.test.ts`

Expected: FAIL because the new services and repositories do not exist.

- [ ] **Step 3: Implement repositories following the existing TaskRepository pattern**

Add explicit methods for insert, find by ID, list versions, find current version, and insert review. Keep database access out of the schema and state modules.

- [ ] **Step 4: Implement services with Zod parsing and transactional boundaries**

Create ContentItem with raw material only. Ensure ContentVersion payloads are parsed by the deliverable schema. Ensure Review always references a concrete ContentVersion and stores only decision/note.

- [ ] **Step 5: Run focused service tests and verify they pass**

Run: `npm test -- tests/content/content.service.test.ts tests/content/content-version.service.test.ts tests/review/review.service.test.ts`

Expected: PASS with all assertions green.

### Task 4: Task association compatibility

**Files:**
- Modify: `src/modules/task/task.repository.ts`
- Modify: `src/modules/task/task.service.ts`
- Modify: `src/modules/task/task.schema.ts`
- Modify: `src/modules/task/task.types.ts`
- Modify: `tests/tasks/task.service.test.ts`
- Modify: `tests/tasks/task-schema.test.ts`

**Interfaces:**
- Existing Task creation remains valid for legacy callers.
- New Task creation may accept `contentItemId` and persists it without changing Task's technical status behavior.
- Task reads expose `contentItemId` when present.

- [ ] **Step 1: Add failing tests for optional ContentItem association**

Assert that legacy task input remains accepted and that a task created with a valid ContentItem ID returns and persists the association.

- [ ] **Step 2: Run task-focused tests and verify the new association assertion fails**

Run: `npm test -- tests/tasks/task-schema.test.ts tests/tasks/task.service.test.ts`

Expected: the new association assertion fails before implementation.

- [ ] **Step 3: Add the optional association to the Task schema, view, repository insert, and read paths**

Do not rename Task fields or alter Task/Workflow status transitions. Keep the association nullable for backward compatibility with existing tasks.

- [ ] **Step 4: Run all task tests and verify they pass**

Run: `npm test -- tests/tasks/task-schema.test.ts tests/tasks/task.service.test.ts`

Expected: PASS.

### Task 5: Phase A integration and verification

**Files:**
- Modify: `tests/db/schema-contract.test.ts` if additional constraints need coverage
- Create: `tests/content/content-domain.integration.test.ts` only if a database-backed contract can run in the configured environment

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Record any failures separately from the known local PostgreSQL availability issue.

- [ ] **Step 2: Run lint and typecheck**

Run: `npm run lint && npm run typecheck`

- [ ] **Step 3: Run production build**

Run: `npm run build`

- [ ] **Step 4: Run Drizzle checks**

Run: `npm run db:check`

- [ ] **Step 5: Inspect the diff for Phase B leakage**

Confirm no Content Library, Review Center, Dashboard, major UI, Workflow Engine, LLM Provider, Structured Output, or SSE core changes are present.

- [ ] **Step 6: Commit Phase A only**

```bash
git add src/db src/modules/content src/modules/review src/modules/task tests drizzle docs/superpowers/plans/2026-08-31-phase-a-domain-model.md
git commit -m "feat: add content domain foundations"
```

The worktree-local Git identity must remain `zht <764659983@qq.com>`; do not alter global Git configuration.
