# Phase 8 AI Content Workspace UI Design

## Goal

Turn the existing Task, Workflow, SSE, and AnalysisResult APIs into a usable desktop-first three-column AI content production workspace without changing the Phase 7 AI pipeline.

## Scope and constraints

- Use `/` as the empty/new-task Workspace entry.
- Use `/tasks/[taskId]` as the only persistent URL for an opened task; do not add a parallel `?taskId=` state source.
- Keep `/workflow-runs/[runId]` as the existing engineering/debug page.
- Reuse the Phase 6 Workflow Snapshot API, SSE Hook, and Workflow Reducer. Only make minimal extensions when the existing contract cannot support the UI.
- Reuse existing Task and Workflow APIs for retry. A failed task starts a new WorkflowRun through the existing run endpoint; old runs remain preserved.
- Fetch final content only from `GET /api/tasks/:taskId/results/latest`. The browser must not assemble final results from WorkflowStep output or SSE payloads.
- Do not change the Phase 5/7 prompts, add AI capability, or change the AnalysisResult model.
- Do not implement authentication, uploads, OCR, RAG, MCP, external integrations, multi-agent behavior, or a workflow editor.

## Information architecture

The root page renders `WorkspaceShell` in empty/new-task mode. Selecting a task navigates to `/tasks/[taskId]`, where the same shell loads the Task, latest WorkflowRun, and latest successful AnalysisResult. The URL is the source of truth for the active task after reload.

The shell has a fixed header and three independently scrollable desktop columns:

1. Task Sidebar: create action, historical tasks ordered by newest first, status labels, selection, and delete confirmation.
2. Task/Workflow Column: new-task form or task header, input preview, run/retry action, workflow connection state, and the seven-step timeline.
3. Result Column: loading/empty/error states and seven result tabs. It fetches the formal Result API after completion and never derives the result from realtime events.

On narrow screens the columns degrade to a collapsible sidebar and tabbed result area. Desktop widths around 1366, 1440, and 1920 must remain usable.

## Data flow

```text
GET /api/tasks
        |
        v
Task Sidebar -- navigate --> /tasks/:taskId
        |
        +--> GET /api/tasks/:taskId
        +--> GET /api/workflow-runs/:runId
        +--> existing useWorkflowEvents + reducer
        +--> GET /api/tasks/:taskId/results/latest
```

Creating a task uses the existing Task API, then starts `FULL_CONTENT_ANALYSIS` through the existing run API. The returned run ID drives the existing Snapshot/SSE lifecycle. Completion triggers a Result API fetch. Failed execution shows the failed step and uses the same run endpoint to create a new run.

## Component boundaries

Use focused components under `src/components/workspace/`:

- `workspace-shell.tsx`: layout and active-mode composition only.
- `task-sidebar.tsx`: task list, selection, create, and delete actions.
- `new-task-form.tsx`: title/type/content validation and create/start flow.
- `task-detail-header.tsx`: task metadata and primary action.
- `workflow-timeline.tsx` and `workflow-step-item.tsx`: reducer snapshot rendering and step progress.
- `analysis-result-panel.tsx` and result tab components: formal result rendering and copy actions.

Use `src/lib/api/` for task, workflow, and result request functions. Keep browser fetches out of page-level presentation components.

## Realtime state

The page first loads the persisted Workflow snapshot. If the run is unfinished, it reuses the Phase 6 SSE Hook, which applies events through the existing reducer. Terminal runs do not open an unnecessary SSE connection. SSE connection state is secondary UI information and must never replace the persisted snapshot as the source of truth.

When a completion event reports `resultAvailable: true`, the UI requests the formal Result API. When task status changes to completed or failed, refresh the task list through the existing Task API rather than opening another sidebar SSE stream.

## Error and loading behavior

Each server operation has an inline readable error state with a retry/reload action where meaningful: task list, task detail, workflow snapshot, SSE, result, create, run, and delete. Loading states use stable skeletons or placeholders. Timeline updates do not produce noisy toasts; create, copy, delete, and actionable failures may use the existing lightweight toast approach or an equivalent local message.

## Result presentation

The Result panel exposes tabs for Overview, Hook, Structure, Emotion, Optimization, Script, and Marketing. Script, titles, cover text, and publish copy support `navigator.clipboard` with a visible success message. Result content is read-only in this phase.

## Accessibility and safety

All controls have labels, task items have keyboard focus, status is conveyed by text as well as color, and confirmation dialogs can be dismissed. Provider and database secrets stay server-side; no browser component receives `DEEPSEEK_API_KEY` or `DATABASE_URL`.

## Acceptance criteria

- `/` is a usable empty/new-task Workspace, not a development placeholder.
- `/tasks/[taskId]` survives reload and restores Task, Workflow, and Result state.
- A user can create a transcript/copy/topic task and start `FULL_CONTENT_ANALYSIS`.
- The center column renders all seven steps with real Snapshot/SSE transitions.
- Completion loads all seven result areas from the formal Result API.
- Failed tasks show failure details and can be re-run through the existing run API.
- Tasks can be reopened and deleted from the sidebar.
- Loading and recoverable error states exist for the required operations.
- Tests, lint, typecheck, production build, and the browser smoke flow pass.

