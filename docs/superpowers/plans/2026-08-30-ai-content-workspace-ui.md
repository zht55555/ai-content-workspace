# AI Content Workspace UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 8 desktop-first three-column Workspace UI on top of the existing Task, Workflow, Snapshot, SSE, and Result APIs.

**Architecture:** `/` renders the empty/new-task Workspace and `/tasks/[taskId]` is the only persistent active-task URL. Focused client components compose the three columns; a small API client layer owns browser requests; the existing Phase 6 SSE Hook and Workflow Reducer remain the realtime state path; the formal Result API remains the only result source.

**Tech Stack:** Next.js App Router, React 19, TypeScript strict, Tailwind CSS, existing shadcn-compatible primitives, Vitest, Testing Library-compatible React tests only if already available.

**Spec:** `docs/superpowers/specs/2026-08-30-ai-content-workspace-ui-design.md`

## Global Constraints

- Use `/tasks/[taskId]` as the only persistent URL for an opened task.
- Reuse the Phase 6 Snapshot API, SSE Hook, and Workflow Reducer; do not create a second workflow state manager.
- Reuse the existing run endpoint for retry; do not add a special rerun endpoint.
- Fetch AnalysisResult only from `GET /api/tasks/:taskId/results/latest`.
- Do not modify Phase 5/7 prompts, Workflow step order, or AnalysisResult schema.
- Do not implement Phase 9 or Future Enhancements.

### Task 1: Establish UI contracts and API client boundaries

**Files:**
- Create: `src/lib/api/client.ts`
- Create: `src/lib/api/tasks.ts`
- Create: `src/lib/api/workflow-runs.ts`
- Create: `src/lib/api/analysis-results.ts`
- Create: `src/components/workspace/workspace.types.ts`
- Test: `tests/workspace/api-client.test.ts`

**Interfaces:**
- API functions return typed JSON and throw readable `ApiClientError` values for non-2xx responses.
- Task functions provide `listTasks`, `getTask`, `createTask`, `deleteTask`.
- Workflow functions provide `runFullContentAnalysis`, `getWorkflowSnapshot`.
- Result functions provide `getLatestAnalysisResult`.
- Workspace types define the active task, selected result tab, and connection status without introducing a global store.

- [ ] Step 1: Write tests for successful JSON requests and non-2xx error conversion.
- [ ] Step 2: Run `npm test -- tests/workspace/api-client.test.ts` and verify the new tests fail because the client module does not exist.
- [ ] Step 3: Implement the minimal request helper and typed endpoint wrappers using the existing API payloads.
- [ ] Step 4: Run the focused test and then `npm run typecheck`.

### Task 2: Build the Workspace shell and persistent routes

**Files:**
- Modify: `app/page.tsx`
- Create: `app/tasks/[taskId]/page.tsx`
- Create: `src/components/workspace/workspace-shell.tsx`
- Modify: `app/globals.css`
- Test: `tests/workspace/workspace-shell.test.tsx`

**Interfaces:**
- `WorkspaceShell` accepts `taskId?: string` and renders empty/new mode or selected-task mode.
- `/tasks/[taskId]` passes the route parameter to `WorkspaceShell`; `/` passes no task ID.

- [ ] Step 1: Write tests proving root renders the three regions and task route renders the selected-task shell.
- [ ] Step 2: Run the focused test and verify failure for missing shell/route.
- [ ] Step 3: Implement a fixed-header, independently-scrollable three-column shell with responsive degradation.
- [ ] Step 4: Run the focused test, `npm run lint`, and `npm run typecheck`.

### Task 3: Implement Task Sidebar and New Task form

**Files:**
- Create: `src/components/workspace/task-sidebar.tsx`
- Create: `src/components/workspace/new-task-form.tsx`
- Create: `src/components/workspace/task-status-badge.tsx`
- Test: `tests/workspace/task-sidebar.test.tsx`
- Test: `tests/workspace/new-task-form.test.tsx`

**Interfaces:**
- Sidebar receives task data, selected ID, loading/error state, and callbacks for select/create/delete.
- New-task form validates title/content/type locally, calls `createTask`, then calls `runFullContentAnalysis`, and navigates to `/tasks/:taskId`.
- Delete uses the existing `DELETE /api/tasks/:taskId` endpoint after explicit confirmation.

- [ ] Step 1: Write tests for list rendering, visible status text, keyboard-selectable task items, validation, create success, create failure, and delete callback.
- [ ] Step 2: Run focused tests and verify the expected failures.
- [ ] Step 3: Implement the sidebar and form with stable loading/error states and disabled submit during create/run.
- [ ] Step 4: Run focused tests and fix only implementation failures.

### Task 4: Connect Task Detail and Workflow Timeline

**Files:**
- Create: `src/components/workspace/task-detail-header.tsx`
- Create: `src/components/workspace/workflow-timeline.tsx`
- Create: `src/components/workspace/workflow-step-item.tsx`
- Create: `src/components/workspace/use-workspace-workflow.ts`
- Modify: `src/workflow/events/use-workflow-events.ts` only for a minimal contract extension if required
- Test: `tests/workspace/workflow-timeline.test.tsx`
- Test: `tests/workspace/use-workspace-workflow.test.ts`

**Interfaces:**
- The hook loads the persisted snapshot first, then invokes the existing `useWorkflowEvents` only for unfinished runs.
- The timeline consumes the existing reducer snapshot shape and renders seven step labels, status text, retry count, timestamps, and duration.
- Run/retry calls the existing run endpoint with `FULL_CONTENT_ANALYSIS`; no special rerun API is introduced.

- [ ] Step 1: Write tests for snapshot rendering, `step.started` to RUNNING, `step.completed` to SUCCESS, terminal runs not opening SSE, and failed rerun using the standard run call.
- [ ] Step 2: Run focused tests and verify failure before implementation.
- [ ] Step 3: Implement the hook and timeline by composing the existing SSE Hook and Reducer.
- [ ] Step 4: Run focused tests plus all existing workflow/SSE tests.

### Task 5: Implement formal Result panel and copy actions

**Files:**
- Create: `src/components/workspace/analysis-result-panel.tsx`
- Create: `src/components/workspace/result-tabs.tsx`
- Create: `src/components/workspace/result-copy-button.tsx`
- Modify: `src/workflow/results/content-analysis-result-view.tsx` only if extracting reusable result sections is needed
- Test: `tests/workspace/analysis-result-panel.test.tsx`

**Interfaces:**
- Result panel accepts `taskId`, `resultAvailable`, loading/error state, and a result-fetch callback.
- It requests only `getLatestAnalysisResult(taskId)` after completion and renders Overview, Hook, Structure, Emotion, Optimization, Script, and Marketing tabs.
- Copy buttons call `navigator.clipboard.writeText` and show local success feedback.

- [ ] Step 1: Write tests for formal API loading, seven tabs, script/marketing rendering, and copy behavior.
- [ ] Step 2: Run focused tests and verify the new tests fail.
- [ ] Step 3: Implement read-only result tabs with concise, accessible labels and copy controls.
- [ ] Step 4: Run focused tests and verify no WorkflowStep/SSE payload is used to build results.

### Task 6: Compose server data, loading/error states, and sidebar refresh

**Files:**
- Modify: `src/components/workspace/workspace-shell.tsx`
- Modify: `src/components/workspace/task-sidebar.tsx`
- Modify: `app/tasks/[taskId]/page.tsx`
- Test: `tests/workspace/workspace-flow.test.tsx`

**Interfaces:**
- Workspace loads Task List for the sidebar and selected Task/Workflow snapshot from the persistent route.
- Completion/failure refreshes the task list through the Task API; no sidebar SSE is added.
- Deleting the active task navigates to `/` and returns to empty/new mode.

- [ ] Step 1: Write an integration-style component test for create-to-run composition, completion-to-result fetch, active deletion, and recoverable API errors.
- [ ] Step 2: Run the focused test and verify it fails.
- [ ] Step 3: Wire the components together, preserving independent local UI state for form/tab/dialog.
- [ ] Step 4: Run all workspace tests and the full existing test suite.

### Task 7: Documentation and final UI polish

**Files:**
- Modify: `README.md`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Test: existing workspace component tests

- [ ] Step 1: Add the Workspace routes, user flow, and local DemoProvider usage to the README.
- [ ] Step 2: Apply only focused typography, border, spacing, focus, and responsive adjustments required by the acceptance criteria.
- [ ] Step 3: Run lint, typecheck, and workspace tests.

### Task 8: Verification, Browser Smoke Test, and delivery

**Files:**
- No new production files; inspect the complete diff.

- [ ] Step 1: Run `npm run lint`.
- [ ] Step 2: Run `npm run typecheck`.
- [ ] Step 3: Run `npm test`.
- [ ] Step 4: Run `npm run build`.
- [ ] Step 5: Start the DemoProvider app and perform the complete browser flow: empty state, create, seven live steps, result tabs, copy, reopen, refresh, and delete.
- [ ] Step 6: Check `git status`, `.env`, secrets, logs, screenshots, and test artifacts before staging.
- [ ] Step 7: Commit with `feat: build ai content workspace ui`.
- [ ] Step 8: Push with `git push origin main` and verify `main` matches `origin/main`; never force push.

