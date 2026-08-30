# Phase 7：完整内容分析 Workflow 设计

## 目标

将 Phase 5 的三步 Structured Content Demo 扩展为可演示的 `FULL_CONTENT_ANALYSIS` 七步业务 Workflow，并将最终经 Zod 校验的 `ContentAnalysisResult` 持久化为 `AnalysisResult`，通过 Phase 6 SSE 展示实时进度。

## 范围与兼容性

保留 `DEMO_CONTENT_WORKFLOW` 和 `STRUCTURED_CONTENT_DEMO` 作为回归测试 Workflow；新增固定顺序的 `FULL_CONTENT_ANALYSIS`，不引入动态 DAG、RAG、MCP、登录、文件上传或 Phase 8 三栏工作台。

现有 Run API 同时支持两种真实执行语义：默认同步 `runWorkflow()` 和 `async: true` 的后台 `startWorkflow()`。本阶段保留该参数；Full Workflow 的 SSE 演示使用后台模式。

## 七步 Workflow

```text
content-analysis
  -> hook-analysis
  -> structure-analysis
  -> emotion-analysis
  -> optimization
  -> script-generation
  -> marketing-content
```

每个 Step 使用独立 PromptDefinition、输入 DTO 和 Zod 输出 Schema。Step 只读取原始内容和完成该 Step 所需的前序 Typed Result，不将全部历史 JSON 传入下游。

| Step | 最小输入 | 输出 |
| --- | --- | --- |
| content-analysis | inputType、rawContent | `Analysis` |
| hook-analysis | inputType、rawContent、analysis | `Hook` |
| structure-analysis | inputType、rawContent、analysis、必要时 hook | `StructureNode[]` |
| emotion-analysis | inputType、rawContent、analysis、structure | `Emotion` |
| optimization | rawContent、analysis、hook、structure、emotion | `Optimization` |
| script-generation | rawContent、analysis、hook、structure、emotion、optimization | `GeneratedScript` |
| marketing-content | generatedScript、analysis、必要的 rawContent | `Marketing` |

所有跨 Step 数据使用 `z.infer` 类型。禁止 `any`、字符串 JSON 传递和下游自行 `JSON.parse` 前序结果。

## Finalization 与事务边界

Finalization 作为独立服务，不显示为第八个用户 Step。七步成功后执行：

1. 从 Typed Step Output 构建 `ContentAnalysisResult`。
2. 使用 `ContentAnalysisResultSchema` 再次校验。
3. 开启 Drizzle Transaction，同时写入 `AnalysisResult`、更新 `WorkflowRun.outputJson/COMPLETED`、更新 Task 为 `COMPLETED`。
4. Transaction Commit 成功后，才发布 `workflow.completed`，且事件只携带 `resultAvailable: true` 等安全元信息。

如果最终校验或事务失败：不发布 `workflow.completed`，不向前端声明结果可用；WorkflowRun 和 Task 进入 FAILED，正式 `AnalysisResult` 不产生或保持原有成功历史不变。基于 `workflowRunId` 唯一约束实现 Finalization 幂等。

## 数据模型调整

使用新增 Drizzle Migration，不修改历史 Migration：

- `analysis_results.workflow_run_id` 对应现有 `workflowRunId` 增加唯一约束。
- 增加 `result_type` 和 `schema_version`，默认值分别为 `CONTENT_ANALYSIS`、`content-analysis-result.v1`。
- `llm_usages` 增加 `task_id` 外键。
- Token 字段改为 nullable；真实 Provider 在没有返回 usage 的失败请求上写入 NULL，而不是伪造 0。DemoProvider 统一写 0，并通过 `usageAvailable` 语义区分未知和真实零消耗（若采用字段调整，则一并通过 Migration 落地）。

保留失败 WorkflowRun、WorkflowStep 和历史 AnalysisResult；不对 `taskId` 做全局唯一。

## Usage 记录

每次 Provider 调用由 Workflow 层记录 `taskId`、`workflowRunId`、`workflowStepId`、provider、model、usage 和 latency。Structured Retry 与 Workflow Retry 的职责不合并：StructuredGenerationService 处理格式/Schema 重试，WorkflowEngine 只处理可重试的 Provider/执行错误。最大调用次数由两层上限相乘并在文档和测试中明确，默认单个 Step 最多 3 次 Structured 调用，Workflow 层最多 3 次尝试；Demo 成功路径每 Step 一次调用。

## API 与 SSE

保留：

```text
POST /api/tasks/:taskId/run
GET  /api/workflow-runs/:runId
GET  /api/workflow-runs/:runId/events
```

新增：

```text
GET /api/tasks/:taskId/results/latest
```

Run Snapshot 返回轻量状态和 `resultAvailable`，不重复嵌入完整分析结果。SSE 发送七个 Step 的 started/completed、retrying、failed 和 workflow completed/failed 事件；不发送完整 LLM Output。客户端在收到 `resultAvailable: true` 后通过 Result API 读取最终结果。

## 失败、重跑与状态

任一 Step 最终失败时，当前 Step 为 FAILED，后续 Step 不执行，WorkflowRun 和 Task 为 FAILED，前序成功 Step Output 保留，不写正式结果。FAILED Task 可创建新的 WorkflowRun；旧记录保留，新的成功结果成为 latest。已完成 Run 的 Finalization 不重复插入结果。

## UI

升级现有 `/workflow-runs/:runId` 页面：时间线仍来自 Snapshot + SSE；结果区域独立读取 Result API，展示摘要、Hook、Structure、Emotion、Optimization、Generated Script 和 Marketing。刷新后重新读取数据库状态与结果，不依赖浏览器内存事件拼装。

## 验证

必须通过 lint、TypeScript、Vitest、Drizzle check、生产构建，以及 Demo Full Workflow、SSE、Result API 和浏览器页面冒烟测试。真实 DeepSeek 测试只在本地存在 `DEEPSEEK_API_KEY` 时运行，自动化测试禁止消耗真实额度；没有 Key 不阻塞 Phase 7。
