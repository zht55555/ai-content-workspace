# Phase 9：稳定性、失败恢复与体验完善

## 目标

在不新增 AI 业务能力的前提下，让当前三栏 Workspace 与七步 Workflow 在重复操作、失败、断线、刷新和任务切换时状态清晰且可恢复。

## 已确认设计

- `workflow_runs_one_active_per_task_idx` 使用 PostgreSQL 部分唯一索引，限制同一 Task 同时只有一个 `PENDING`、`QUEUED` 或 `RUNNING` Run。
- Task 状态更新与 WorkflowRun/WorkflowStep 创建在同一 Drizzle Transaction 中完成；唯一冲突转换为 `TASK_ALREADY_RUNNING`。
- 数据库仍是 Workflow 状态事实来源，SSE 只负责增量事件；断线后有限次退避重连，并先通过 Snapshot API 校准。
- 初次载入已有终态 Run 不触发任务列表刷新，只有运行态进入终态时刷新侧栏。
- API 客户端统一处理非 JSON 响应和已知业务错误，不向 UI 泄漏底层解析异常。
- StructuredGenerationService 保持业务级 Schema Retry，WorkflowEngine 保持 Workflow 级 Retry；不引入第二套 AI 执行系统。
- 继续保留 `/` 空态与 `/tasks/[taskId]` 持久 URL，不使用 query 参数定位任务。

## 不在范围内

RAG、MCP、Redis、Kafka、外部平台、登录权限、Multi-Agent、新 Provider 和 Phase 10 项目包装。

## 风险与限制

当前 Event Bus 仍是单进程内存实现，未引入跨实例事件 Replay；Next.js 开发态偶发脚本异常仅在可稳定归因于业务代码时修复，生产构建作为主要验证依据。
