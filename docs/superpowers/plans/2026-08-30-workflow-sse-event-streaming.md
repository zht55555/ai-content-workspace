# Workflow SSE Event Streaming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为现有 Workflow Engine 增加进程内领域事件、标准 SSE 事件流和最小 WorkflowRun 状态页面，让浏览器可以实时观察 Demo Workflow 的执行过程。

**Architecture:** Workflow Engine 只依赖可选 Event Publisher，发布明确的 WorkflowEvent discriminated union；In-Memory Event Bus 按 `workflowRunId` 隔离订阅并隔离 Listener 异常。SSE Route 负责 Snapshot 校验、订阅、标准 SSE 编码和 heartbeat；浏览器页面先读取 Snapshot，再由独立 SSE Client/React hook 应用增量事件。为获得实时 runId，Run API 增加异步启动路径，但保留默认 Phase 4 同步行为。

**Tech Stack:** Next.js App Router, TypeScript strict, React, PostgreSQL, Drizzle ORM, Zod, Vitest, browser EventSource.

**Spec:** User-provided Phase 6 specification and confirmed SSE design in chat.

## Global Constraints

- 不修改数据库 Schema，不新增 Event 表、Event Store、Redis、Kafka、WebSocket 或外部消息队列。
- Workflow Engine 不依赖 HTTP、SSE、React、Response 或 ReadableStream。
- Event 发布失败不能反向导致已持久化的业务状态失败。
- 不实现完整七步内容 Workflow、最终三栏工作台、RAG、MCP、登录注册或文件上传。
- SSE 只发送可 JSON 序列化的业务状态，不发送 API Key、Provider Header、Secret、堆栈或隐藏推理链。
- 不使用 `any`；所有事件使用明确的 discriminated union。
- 默认 DemoProvider 延迟关闭；仅手动演示可通过配置启用小延迟。
- 数据库 Snapshot 仍是事实来源，不实现 Event Replay。
- 所有新增生产代码先写失败测试，再实现最小代码。

---

### Task 1: Define Workflow Events and In-Memory Bus

**Files:**
- Create: `src/workflow/events/workflow-event.types.ts`
- Create: `src/workflow/events/workflow-event.errors.ts`
- Create: `src/workflow/events/workflow-event.publisher.ts`
- Create: `src/workflow/events/in-memory-workflow-event-bus.ts`
- Test: `tests/workflow/workflow-event-bus.test.ts`

**Interfaces:**
- `WorkflowEvent` is a discriminated union containing workflow lifecycle and step lifecycle event types.
- Every event contains `eventId`, `eventType`, `workflowRunId`, `taskId`, and ISO-compatible `timestamp`.
- Step events contain `step: { id, key, sequence, title }`.
- `WorkflowEventPublisher.publish(event)` is safe for callers; listener errors are isolated and logged.
- `InMemoryWorkflowEventBus.subscribe(workflowRunId, listener)` returns an unsubscribe function; `publish(event)` only reaches listeners for that run.

- [ ] **Step 1: Write failing Event Bus tests**

Cover subscribe/publish, unsubscribe, runId isolation, multiple subscribers, and one throwing subscriber not blocking another subscriber.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/workflow/workflow-event-bus.test.ts`

Expected: FAIL because event types and bus do not exist.

- [ ] **Step 3: Implement the union, publisher contract, and bus**

Use `Set` listeners grouped by runId. Catch and log listener failures after other listeners have been invoked; never throw a listener exception back to Workflow Engine.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- tests/workflow/workflow-event-bus.test.ts`

Expected: PASS.

### Task 2: Add Safe Event Serialization and SSE Encoder

**Files:**
- Create: `src/workflow/events/workflow-event-serializer.ts`
- Create: `src/workflow/events/sse.ts`
- Test: `tests/workflow/workflow-event-serializer.test.ts`

**Interfaces:**
- `serializeWorkflowEvent(event)` returns JSON-safe event data or throws `EVENT_SERIALIZATION_ERROR`.
- `encodeSseEvent(event)` returns standard `id`, `event`, and `data` lines ending in a blank line.
- `encodeSseComment(comment)` returns an SSE comment heartbeat frame.
- Error objects are reduced to `{ code, message }`; secrets, provider objects, schemas, BigInt, and stack traces are not emitted.

- [ ] **Step 1: Write failing serializer and encoder tests**

Assert standard SSE framing, JSON data parsing, event fields, and rejection of non-serializable payloads.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/workflow/workflow-event-serializer.test.ts`

Expected: FAIL because serializer and SSE helpers do not exist.

- [ ] **Step 3: Implement safe serialization and framing**

Serialize only known event fields and event-specific payloads. Do not call `JSON.stringify` on arbitrary domain objects supplied by Providers.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- tests/workflow/workflow-event-serializer.test.ts`

Expected: PASS.

### Task 3: Integrate Lifecycle Events into Workflow Engine

**Files:**
- Modify: `src/workflow/workflow-engine.ts`
- Modify: `src/workflow/workflow-types.ts`
- Modify: `src/workflow/workflow-repository.ts`
- Modify: `src/ai/llm/providers/demo-provider.ts`
- Modify: `src/ai/llm/llm-types.ts`
- Test: `tests/workflow/workflow-engine-events.test.ts`

**Interfaces:**
- `WorkflowEngine` accepts an optional `eventPublisher`, defaulting to the process-local singleton bus.
- Existing `runWorkflow()` remains available and preserves Phase 4 synchronous behavior.
- Add `startWorkflow(taskId, definition)` returning the created run Snapshot immediately and executing the existing run logic asynchronously.
- Event publication is best-effort and cannot change repository update results.
- DemoProvider accepts optional `demoDelayMs`; default is `0`, and delay observes `AbortSignal`.

- [ ] **Step 1: Write failing Engine event tests**

Use an in-memory publisher spy to assert started, step started, retrying, step completed/failed, and workflow completed/failed events in order. Assert publisher exceptions do not make a successful run fail. Assert DemoProvider delay defaults to zero.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/workflow/workflow-engine-events.test.ts`

Expected: FAIL because Workflow Engine does not publish events or expose asynchronous start.

- [ ] **Step 3: Implement event hooks and asynchronous start**

Extract common run initialization/execution without changing repository state transitions. Publish after successful persistence calls. Wrap publisher calls in a private best-effort helper. Emit retrying before each retry attempt. Add optional DemoProvider delay outside the Engine.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- tests/workflow/workflow-engine-events.test.ts`

Expected: PASS.

- [ ] **Step 5: Run existing Workflow tests**

Run: `npm test -- tests/workflow/workflow.engine.test.ts`

Expected: existing Phase 4 behavior remains green.

### Task 4: Implement Run Selection and SSE Endpoint

**Files:**
- Modify: `app/api/tasks/[taskId]/run/route.ts`
- Create: `app/api/workflow-runs/[runId]/events/route.ts`
- Create: `src/workflow/workflow-runtime.ts`
- Test: `tests/workflow/workflow-sse-route.test.ts`

**Interfaces:**
- `POST /api/tasks/:taskId/run` accepts optional `{ workflowType: "STRUCTURED_CONTENT_DEMO", async?: boolean }` while retaining the existing default Phase 4 path.
- `GET /api/workflow-runs/:runId/events` first verifies the run belongs to the Demo User, then returns a `ReadableStream` with snapshot-independent future events.
- Missing or unauthorized runs return a normal JSON error, never an idle SSE stream.
- Runtime singleton keeps the Event Bus and Workflow Engine in the persistent Node.js process so API requests share subscriptions.

- [ ] **Step 1: Write failing route tests**

Cover JSON response for missing run, `text/event-stream` headers, standard event frame, runId isolation, and disconnect cleanup. Test async start response includes runId before execution completes.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/workflow/workflow-sse-route.test.ts`

Expected: FAIL because the route and runtime singleton do not exist.

- [ ] **Step 3: Implement runtime, route selection, and SSE stream**

Use `request.signal` to unsubscribe and clear heartbeat timers. Send `: ping\n\n` every 20 seconds. Send events published after subscription using standard SSE encoding. Do not make the Engine import Route or Response.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- tests/workflow/workflow-sse-route.test.ts`

Expected: PASS.

### Task 5: Add Minimal WorkflowRun Page and Client Reducer

**Files:**
- Create: `app/workflow-runs/[runId]/page.tsx`
- Create: `app/workflow-runs/[runId]/workflow-run-live-view.tsx`
- Create: `src/workflow/events/workflow-events.client.ts`
- Create: `src/workflow/events/workflow-run.reducer.ts`
- Test: `tests/workflow/workflow-run.reducer.test.ts`

**Interfaces:**
- `reduceWorkflowRunEvent(snapshot, event)` returns a typed snapshot with updated run/step status.
- Client module exposes `subscribeToWorkflowEvents(runId, handlers)` and cleans EventSource on unsubscribe.
- Server page loads `/api/workflow-runs/:runId` data and passes the Snapshot to the Client Component.
- Page displays IDs, workflow status, connection status, and a simple step timeline with PENDING/RUNNING/SUCCESS/FAILED/SKIPPED.

- [ ] **Step 1: Write failing reducer tests**

Cover `step.started`, `step.completed`, `step.failed`, `workflow.completed`, `workflow.failed`, and unrelated runId events being ignored.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/workflow/workflow-run.reducer.test.ts`

Expected: FAIL because reducer and client/page modules do not exist.

- [ ] **Step 3: Implement the typed reducer, client subscription, and page**

Keep the page small. The Client Component owns EventSource, connection state, cleanup, and reducer application; it never accesses the Event Bus directly and never displays hidden model reasoning.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- tests/workflow/workflow-run.reducer.test.ts`

Expected: PASS.

### Task 6: Add Documentation and Full Smoke Verification

**Files:**
- Modify: `README.md`
- Create: `tests/workflow/workflow-sse.smoke.test.ts`

- [ ] **Step 1: Write the failing end-to-end smoke test**

Create a Demo User Task, start `STRUCTURED_CONTENT_DEMO` asynchronously, subscribe to its runId, collect events, and assert ordered workflow/step events and final database Snapshot `COMPLETED`.

- [ ] **Step 2: Run the smoke test and verify failure**

Run: `npm test -- tests/workflow/workflow-sse.smoke.test.ts`

Expected: FAIL until async start, event publication, and SSE subscription are connected.

- [ ] **Step 3: Add concise local documentation**

Document the SSE endpoint, Snapshot-then-SSE browser flow, supported event types, DemoProvider delay option, and the fact that Event Bus history is not replayed.

- [ ] **Step 4: Run the smoke test and verify pass**

Run: `npm test -- tests/workflow/workflow-sse.smoke.test.ts`

Expected: PASS with no DeepSeek API Key.

### Task 7: Full Verification, Commit, and Push

**Files:**
- Modify only files from Tasks 1–6.

- [ ] **Step 1: Run required checks**

```bash
npm run lint
npm run typecheck
npm test
npm run db:check
npm run build
```

Expected: all pass; database schema remains unchanged.

- [ ] **Step 2: Run the local SSE Smoke Test**

Run: `npm test -- tests/workflow/workflow-sse.smoke.test.ts`

Expected: events are received in order, final WorkflowRun is `COMPLETED`, and Snapshot remains correct after the event stream ends.

- [ ] **Step 3: Check repository safety**

Run: `git status --short --branch` and `git diff --check`. Confirm `.env`, API keys, Secret values, logs, and temporary files are not staged.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add workflow sse event streaming"
```

- [ ] **Step 5: Push without rewriting history**

```bash
git push origin main
```

Verify local `HEAD` equals remote `main` and stop without starting Phase 7.
