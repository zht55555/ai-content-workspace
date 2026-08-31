# Phase C AI Processing Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect ContentItem to the existing Task/Workflow/SSE pipeline and finalize successful AI processing into an AnalysisResult, an AI_GENERATED ContentVersion, and WAITING_REVIEW business status.

**Architecture:** Add a content-processing orchestration service at the business boundary. It validates and locks the ContentItem transition, creates the existing Task and TaskInput transactionally, starts the existing WorkflowEngine, and attaches a completion bridge that reads the persisted AnalysisResult and creates the deliverable version. Existing WorkflowEngine, LLM provider, structured generation, WorkflowRun snapshot, and SSE responsibilities remain unchanged.

**Tech Stack:** Next.js App Router, TypeScript, Drizzle ORM/PostgreSQL, Zod, Vitest, existing WorkflowEngine/EventSource client.

**Spec:** Existing AI Content Workspace 2.0 design document and Phase A/B implementation in repository history.

## Global Constraints

- Implement Phase C only; do not implement Review, approval, human version editing, version compare, Dashboard, RAG, Tool Calling, MCP, OAuth, or multi-tenant behavior.
- Reuse `Task`, `TaskInput`, `WorkflowRun`, `WorkflowStep`, `WorkflowEngine`, `LLMProvider`, `StructuredGenerationService`, Snapshot, and SSE.
- Keep `AnalysisResult` as the complete AI analysis result; `ContentVersion.contentJson` contains only deliverables: Script, Titles, Cover Copy, Publish Copy, Keywords.
- First processing failure restores `DRAFT`; later processing failure restores the exact business status captured before `AI_PROCESSING` and retains the current version.
- All new behavior is introduced test-first: write a failing test, observe the expected failure, implement the smallest passing change, then refactor.
- Use the repository-local Git identity `zht <764659983@qq.com>`.

---

### Task 1: Define processing contracts and failure persistence

**Files:**
- Modify: `src/modules/content/content.schema.ts`
- Modify: `src/modules/content/content.types.ts`
- Modify: `src/modules/content/content.repository.ts`
- Test: `tests/content/content-processing.service.test.ts`

**Interfaces:**
- Produces `StartContentProcessingInputSchema` for a content id and optional processing metadata.
- Produces repository operations for atomic processing start, content failure restoration, and successful finalization.
- Preserves existing ContentVersion schema and adds no AnalysisResult fields to it.

- [ ] **Step 1: Write failing contract tests**

Test that a processing start changes a DRAFT ContentItem to `AI_PROCESSING`, stores its previous status, and that failure restores the previous status while leaving `currentVersionId` unchanged.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `npm test -- --run tests/content/content-processing.service.test.ts`

Expected: FAIL because the processing service and persistence operations do not exist.

- [ ] **Step 3: Implement minimal schema/types/repository operations**

Add only the input contract and repository methods needed by the service. Use a transaction for the status transition plus Task/TaskInput creation; use conditional updates on the expected processing state to prevent a second active processing start.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --run tests/content/content-processing.service.test.ts`

Expected: PASS for start-state and failure-restore behavior.

- [ ] **Step 5: Commit the contract slice**

```bash
git add src/modules/content tests/content/content-processing.service.test.ts
git commit -m "feat: add content processing contracts"
```

### Task 2: Add orchestration around TaskService and WorkflowEngine

**Files:**
- Create: `src/modules/content/content-processing.service.ts`
- Modify: `src/modules/task/task.service.ts` only if a narrow reusable method is required
- Test: `tests/content/content-processing.service.test.ts`

**Interfaces:**
- `start(contentItemId: string): Promise<{ contentItemId: string; taskId: string; workflowRunId: string; status: "AI_PROCESSING" }>`.
- `processCompletion(taskId: string, workflowRunId: string): Promise<void>`.
- `processFailure(taskId: string, workflowRunId: string, error: unknown): Promise<void>`.

- [ ] **Step 1: Add failing tests for Content → Task → Workflow start**

Assert that the service rejects archived or already-processing content, creates a `TRANSCRIPT_ANALYSIS` Task linked through `contentItemId`, copies raw content into TaskInput, changes the business status to `AI_PROCESSING`, and invokes `WorkflowEngine.startWorkflow` with the new task id.

- [ ] **Step 2: Run the focused test and verify it fails for the missing orchestration**

Run: `npm test -- --run tests/content/content-processing.service.test.ts`

Expected: FAIL because no service coordinates the content and workflow records.

- [ ] **Step 3: Implement the orchestration service**

Use `ContentRepository`, `TaskRepository`, `TaskService` or its existing transaction primitives, `WorkflowEngine`, `AnalysisResultRepository`, and `ContentVersionRepository`. Do not duplicate workflow step execution or provider calls. Capture the pre-processing business status before setting `AI_PROCESSING`.

- [ ] **Step 4: Run tests and verify start behavior passes**

Run: `npm test -- --run tests/content/content-processing.service.test.ts`

Expected: PASS for task creation, linkage, state transition, and duplicate-start rejection.

- [ ] **Step 5: Commit the orchestration slice**

```bash
git add src/modules/content/content-processing.service.ts src/modules/task tests/content/content-processing.service.test.ts
git commit -m "feat: orchestrate content ai processing"
```

### Task 3: Bridge successful Workflow completion into AnalysisResult and ContentVersion

**Files:**
- Modify: `src/workflow/workflow-engine.ts` only at the existing completion boundary if a typed callback hook is required
- Modify: `src/workflow/workflow-runtime.ts`
- Modify: `src/modules/content/content.repository.ts`
- Modify: `src/modules/content/content-processing.service.ts`
- Test: `tests/content/content-processing.integration.test.ts`

**Interfaces:**
- Maps `ContentAnalysisResult.generatedScript` to `script`.
- Maps `ContentAnalysisResult.marketing.titles` to `titles`.
- Maps `ContentAnalysisResult.marketing.coverTexts` to `coverCopy`.
- Maps `ContentAnalysisResult.marketing.publishCopy` to `publishCopy`.
- Maps `ContentAnalysisResult.marketing.keywords` to `keywords`.
- Persists version source `AI_GENERATED`, `workflowRunId`, `analysisResultId`, `baseVersionId`, and `isFinal` according to the existing schema, then atomically updates `currentVersionId` and status `WAITING_REVIEW`.

- [ ] **Step 1: Write failing integration tests**

Run the existing DemoProvider workflow through the content processing service. Assert Task, WorkflowRun, WorkflowStep, AnalysisResult, AI_GENERATED ContentVersion, currentVersionId, and WAITING_REVIEW. Assert the version JSON contains deliverables only and not the full analysis object.

- [ ] **Step 2: Run the integration test and verify it fails**

Run: `npm test -- --run tests/content/content-processing.integration.test.ts`

Expected: FAIL because successful workflow completion is not connected to content finalization.

- [ ] **Step 3: Implement the completion bridge**

Reuse `WorkflowFinalizationService` for AnalysisResult persistence. Add a narrowly scoped completion callback or runtime adapter so the existing engine remains responsible for execution and event publishing, while ContentProcessingService owns ContentVersion/status finalization. Make finalization idempotent by checking for the workflow run’s existing AI-generated version before inserting.

- [ ] **Step 4: Run the integration test and verify it passes**

Run: `npm test -- --run tests/content/content-processing.integration.test.ts`

Expected: PASS with the complete business chain persisted.

- [ ] **Step 5: Commit the success bridge**

```bash
git add src/workflow src/modules/content tests/content/content-processing.integration.test.ts
git commit -m "feat: finalize ai content versions"
```

### Task 4: Implement failure recovery and error persistence

**Files:**
- Modify: `src/modules/content/content-processing.service.ts`
- Modify: `src/modules/content/content.repository.ts`
- Test: `tests/content/content-processing.integration.test.ts`

- [ ] **Step 1: Add failing tests for first-run and existing-version failures**

Use the existing DemoProvider failure mode. Assert first-run failure returns ContentItem to `DRAFT` with `lastError`; seed an ORIGINAL or AI_GENERATED current version and a non-DRAFT pre-processing status, then assert failure restores that exact status, preserves currentVersionId, and does not create a replacement version.

- [ ] **Step 2: Run the failure tests and verify the expected failure**

Run: `npm test -- --run tests/content/content-processing.integration.test.ts`

Expected: FAIL until the completion/failure bridge handles business-state restoration.

- [ ] **Step 3: Implement failure recovery**

Handle both synchronous `startWorkflow` errors and asynchronous workflow terminal failure. Persist the workflow error message in ContentItem.lastError, restore the captured business status, and leave existing versions untouched. Keep technical Task/Workflow status transitions under their existing services.

- [ ] **Step 4: Run the failure tests and verify they pass**

Run: `npm test -- --run tests/content/content-processing.integration.test.ts`

Expected: PASS for DRAFT restoration, exact prior-status restoration, error persistence, and current-version retention.

- [ ] **Step 5: Commit failure handling**

```bash
git add src/modules/content tests/content/content-processing.integration.test.ts
git commit -m "feat: restore content state after ai failure"
```

### Task 5: Add API and Content Detail real-time processing UI

**Files:**
- Create: `app/api/contents/[contentId]/processing/route.ts`
- Modify: `src/lib/api/contents.ts`
- Modify: `src/components/content/content-detail.tsx`
- Create: `src/components/content/content-processing-status.tsx`
- Modify: `src/workflow/events/use-workflow-events.ts` only if the existing hook needs a generic run-id input
- Test: `tests/content/content-processing-api.test.ts`
- Test: `tests/content/content-pages.test.tsx`

- [ ] **Step 1: Write failing API/UI tests**

Assert POST processing returns the task/workflowRun identifiers and AI_PROCESSING status, rejects invalid business states, renders an enabled Start AI Processing button when allowed, renders processing state with Snapshot/SSE data, and on reload rehydrates the latest run from the server.

- [ ] **Step 2: Run focused API/UI tests and verify they fail**

Run: `npm test -- --run tests/content/content-processing-api.test.ts tests/content/content-pages.test.tsx`

Expected: FAIL because the processing endpoint, client integration, and detail controls do not exist.

- [ ] **Step 3: Implement the route and UI**

The route delegates to ContentProcessingService. Content Detail loads the current content and latest run snapshot, starts processing through the API, subscribes to the existing `/api/workflow-runs/:runId/events` SSE endpoint, and displays a compact Execution Detail/timeline area. On terminal events, reload content and latest run; never expose the technical timeline as the page’s primary layout.

- [ ] **Step 4: Run focused tests and verify they pass**

Run: `npm test -- --run tests/content/content-processing-api.test.ts tests/content/content-pages.test.tsx`

Expected: PASS for API validation, button state, refresh recovery, Snapshot rendering, and SSE status updates.

- [ ] **Step 5: Commit the API/UI slice**

```bash
git add app/api/contents src/lib/api/contents.ts src/components/content src/workflow/events tests/content
git commit -m "feat: connect content detail to ai processing"
```

### Task 6: Full verification and handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-08-31-phase-c-ai-processing.md` to mark completed steps.

- [ ] **Step 1: Run lint**

Run: `npm run lint`

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`

- [ ] **Step 3: Run the complete test suite**

Run: `npm test -- --run`

- [ ] **Step 4: Run production build**

Run: `npm run build`

- [ ] **Step 5: Run Drizzle schema check**

Run: `npx drizzle-kit check`

- [ ] **Step 6: Run browser smoke test**

Verify `/contents/[contentId]`: start button, AI_PROCESSING state, live execution status, terminal WAITING_REVIEW state, refresh recovery, and failure message. Do not create Review or version-edit UI.

- [ ] **Step 7: Commit verification/documentation updates**

```bash
git add docs/superpowers/plans/2026-08-31-phase-c-ai-processing.md
git commit -m "docs: record phase c verification"
```

Phase C stops after this task; do not begin Review or Version UI.
