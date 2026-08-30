# AI Content Workflow 设计规格

## 1. 目标与范围

AI Content Workflow 是一个面向短视频内容生产的 AI Workflow 工作台。用户提交视频逐字稿、文案或选题后，系统创建持久化 Task，按固定顺序执行多个分析与创作节点，通过 SSE 展示实时状态，并将经过 Schema 校验的结构化结果保存下来供人工审核、编辑和复用。

第一阶段只实现单 Workflow、多节点的短视频内容分析与脚本生产场景。第一版不实现登录注册、Multi-Agent、RAG、MCP、向量数据库、复杂 RBAC、外部业务系统集成或支付系统。

## 2. 已确认的产品约束

- 采用模块化单体架构与持久运行的 Node.js 进程，不拆微服务。
- 使用 PostgreSQL 与 Prisma。
- 使用 Demo User，不实现登录注册，但所有任务保留 `userId` 关联。
- 实现 Demo Provider 与一个真实 LLM Provider；其他 Provider 只保留扩展接口。
- 无 API Key 时必须可以本地完整演示。
- Workflow、Task、Persistence、LLM Provider、Prompt、Tool、SSE/Event 必须是独立模块。
- Workflow 不得集中在单个 Route Handler 中；Route Handler 只负责协议适配和调用应用服务。
- 核心 LLM 结果必须使用 Zod/JSON Schema 校验，不能依赖 Markdown 作为业务数据。

## 3. 架构决策

### 3.1 总体架构

采用 Next.js 模块化单体：

```text
Browser UI
    │ REST/SSE
    ▼
Next.js Route Handlers
    │
    ├── Task Application Service
    ├── Workflow Engine
    ├── LLM Provider Factory
    ├── Tool Registry
    └── Event Publisher
            │
            ├── PostgreSQL / Prisma
            └── Demo or Real LLM Provider
```

Workflow 运行在持久 Node.js 进程中。数据库是 Task、WorkflowRun、WorkflowStep 和结果的事实来源；SSE 只负责把状态变化推送给前端，连接断开不影响任务执行。

### 3.2 模块边界

- **Task**：创建、查询、重试任务；维护 Task 状态机；不直接调用 LLM。
- **Workflow**：编排固定 Step、记录状态、执行重试与限制；通过 Provider、Tool、Persistence 和 Event 接口协作。
- **LLM Provider**：提供 `generate`、`stream`、`generateStructured`、`toolCall` 统一接口；业务 Workflow 不感知具体模型。
- **Prompt**：维护 Prompt ID、版本、System Prompt、输入/输出 Schema 元数据；不负责执行模型调用。
- **Persistence**：封装 Prisma Client、Repository 和事务；业务模块不直接散落 Prisma 查询。
- **SSE/Event**：定义事件类型、事件载荷和发布/订阅机制；不包含业务分析逻辑。
- **Tool**：以 Registry 管理 `normalize_text` 和 `extract_keywords`，每个 Tool 都有输入输出 Schema。
- **UI**：消费 Task API 与 SSE 事件，管理展示状态；不承担 Workflow 决策。

### 3.3 Provider 策略

Provider Factory 根据环境变量选择真实 Provider；没有可用真实配置时选择 Demo Provider。Demo Provider 返回稳定、可重复且满足 Schema 的结果，并模拟合理的节点进度和 Token 统计，以便完整演示。

第一版实现一个真实 Provider，优先使用 OpenAI-compatible API，具体 Provider 通过配置选择。OpenAI、Claude、DeepSeek、Gemini、Qwen 的接口形态统一保留，但未实现的 Provider 不应伪装为可用。

## 4. 数据模型

### User

`id`、`email`、`name`、`createdAt`、`updatedAt`。Seed 一个 Demo User。

### Task

`id`、`userId`、`name`、`status`、`contentType`、`lastError`、`createdAt`、`updatedAt`、`completedAt`。

Task 状态：`DRAFT`、`QUEUED`、`RUNNING`、`COMPLETED`、`FAILED`、`CANCELLED`。

### TaskInput

`id`、`taskId`、`rawContent`、`normalizedContent`、`contentType`、`createdAt`、`updatedAt`。

### WorkflowRun

`id`、`taskId`、`status`、`currentStep`、`retryCount`、`totalTokens`、`durationMs`、`errorMessage`、`startedAt`、`completedAt`、`failedAt`、`createdAt`、`updatedAt`。

### WorkflowStep

`id`、`workflowRunId`、`stepKey`、`stepOrder`、`status`、`inputJson`、`outputJson`、`errorMessage`、`retryCount`、`startedAt`、`completedAt`、`durationMs`、`createdAt`、`updatedAt`。同一个 Run 内的 `stepKey` 唯一。

Step 状态：`PENDING`、`RUNNING`、`SUCCESS`、`FAILED`、`SKIPPED`。

### AnalysisResult

`id`、`taskId`、`workflowRunId`、`resultJson`、`version`、`createdAt`、`updatedAt`。

### PromptTemplate

`id`、`promptKey`、`version`、`systemPrompt`、`inputSchemaJson`、`outputSchemaJson`、`isActive`、`createdAt`、`updatedAt`。`promptKey + version` 唯一。

### LLMUsage

`id`、`workflowRunId`、`workflowStepId`、`provider`、`model`、`inputTokens`、`outputTokens`、`totalTokens`、`latencyMs`、`createdAt`。

## 5. Workflow 设计

固定顺序为：

```text
Input Normalize
 → Content Analysis
 → Hook Analysis
 → Structure Analysis
 → Emotion Analysis
 → Optimization
 → Script Generation
 → Marketing Content
 → Final Output
```

每个 Step 实现统一的 `WorkflowStep<TInput, TOutput>` 接口，只负责准备输入、调用 Tool/Provider、校验输出并返回结构化结果。Engine 负责顺序、持久化、事件发布、重试、超时和总量限制。

最终结果包含：主题分析、钩子、内容结构、情绪节点、优化建议、新脚本、标题、封面文案、发布文案和关键词。字段均有明确 TypeScript 类型和 Zod Schema。

## 6. 事件与 SSE

事件类型：

```text
task.started
workflow.step.started
workflow.step.progress
workflow.step.completed
workflow.step.failed
llm.token
task.completed
task.failed
```

统一事件载荷包含 `id`、`type`、`taskId`、`workflowRunId`、`stepKey`（可选）、`timestamp` 和 `payload`。数据库状态优先于 SSE 临时状态；页面加载时先读取快照，再建立 SSE 订阅。

## 7. 错误处理与限制

- Provider 超时、限流、暂时性数据库错误、JSON 解析失败和 Schema 失败可重试。
- 输入无效、类型不支持、超限和配置错误不自动重试。
- 每个 Step 最多自动重试 2 次。
- 每个 Task 最多执行 9 个 Step，最长执行时间 5 分钟，最多消耗 50,000 Token。
- 失败时保存失败 Step、错误信息和已完成输出。
- 用户可以重新执行失败任务，重新执行创建新的 WorkflowRun，不覆盖旧 Run。

## 8. UI 范围

工作台采用三栏布局：左侧历史任务与新建任务，中间输入和 Workflow Timeline，右侧结构化结果 Tabs。Timeline 必须显示具体节点名称和 `PENDING/RUNNING/SUCCESS/FAILED/SKIPPED` 状态，禁止只显示“AI 正在思考”。

结果支持查看、编辑和保存；第一版以整体结果保存为主，不实现字段级版本控制。

## 9. 目录边界

```text
app/                         页面与 Route Handlers
src/tasks/                   Task 应用服务、状态机、类型
src/workflow/                Engine、事件、限制、Step
src/ai/providers/            Provider 接口、实现、Factory
src/ai/prompts/              Prompt 定义
src/ai/schemas/              Zod 与领域类型
src/tools/                   Tool 接口、Registry、实现
src/db/                      Prisma Client 与 Persistence
components/                  UI 组件
prisma/                      Schema 与 Seed
tests/                       领域、Provider、Workflow、Tool 测试
```

## 10. 验收标准

用户可在无 API Key 环境下创建任务、启动完整 Workflow、实时看到九个节点状态、查看结构化结果、刷新后恢复历史记录，并在失败后看到明确错误与重试入口。配置真实 Provider 后，同一 Workflow 无需修改业务代码即可运行。
