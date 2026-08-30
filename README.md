# AI Content Workflow

AI 内容生产与运营自动化工作台。当前项目处于 Phase 1：提供 Next.js 项目骨架、TypeScript strict、Tailwind CSS、shadcn/ui 基础配置，以及 PostgreSQL + Drizzle ORM 持久化基础设施。

Task API、Workflow Engine、SSE、LLM Provider 和 AI 业务逻辑尚未在本阶段实现。

## 环境要求

- Node.js 22+
- npm 10+
- PostgreSQL 14+

## 本地启动

1. 安装依赖：

   ```text
   npm install
   ```

2. 创建本地环境文件：

   ```text
   Copy-Item .env.example .env
   ```

   将 `.env` 中的 `DATABASE_URL` 改为你的 PostgreSQL 连接串。`.env` 不得提交到 Git。

3. 创建数据库并生成 Migration：

   ```text
   npm run db:generate
   npm run db:migrate
   ```

4. 写入 Demo User：

   ```text
   npm run db:seed
   ```

5. 启动开发服务：

   ```text
   npm run dev
   ```

   然后打开 `http://localhost:3000`。

## 验证命令

```text
npm run db:check
npm run lint
npm run typecheck
npm test
npm run build
```

如果没有配置 `DATABASE_URL`，数据库集成测试会被跳过；Schema 合约测试仍会执行。要验证真实 Migration 与 Seed，请配置可访问的 PostgreSQL 连接后运行：

```text
npm run db:migrate
npm run db:seed
npm test -- tests/db/seed.test.ts
```

## 数据库目录

- `src/db/schema.ts`：Drizzle 表定义、枚举、关联和推导类型。
- `src/db/client.ts`：持久化数据库连接池与 Drizzle Client。
- `src/db/seed.ts`：幂等 Demo User Seed。
- `drizzle/`：版本化 SQL Migration 文件。
- `drizzle.config.ts`：Drizzle Kit 配置。

## 后续 DeepSeek 配置

Phase 1 不调用大模型。后续接入阶段将使用 `LLM_PROVIDER=deepseek`、`DEEPSEEK_API_KEY` 和 `DEEPSEEK_MODEL`；当前这些变量只作为环境配置预留。

## Task API

Phase 2 已提供 Task 基础管理接口，所有任务自动绑定 Seed 创建的 Demo User。

```text
POST   /api/tasks                 创建 Task 与 TaskInput
GET    /api/tasks                 分页查询，可按 status/type 筛选
GET    /api/tasks/:taskId         查询 Task 详情
PATCH  /api/tasks/:taskId         更新 title 或 status
DELETE /api/tasks/:taskId         删除 Task 及其 TaskInput
POST   /api/tasks/:taskId/run     启动 Demo Content Workflow
GET    /api/workflow-runs/:runId  查询 WorkflowRun 与 Steps
```

创建请求示例：

```json
{
  "title": "分析这条短视频逐字稿",
  "type": "TRANSCRIPT_ANALYSIS",
  "input": {
    "inputType": "TRANSCRIPT",
    "content": "这里是一段短视频逐字稿...",
    "metadata": { "language": "zh-CN" }
  }
}
```

## LLM Provider

Phase 3 已建立统一的 LLM Provider 抽象，默认使用 Demo Provider，不需要 API Key 即可运行 Provider 测试。后续业务接入 DeepSeek 时，在 `.env` 中设置：

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

Phase 3 不会自动调用真实模型；只有显式调用 Provider 时才会发送请求。

Phase 4 使用 `DEMO_CONTENT_WORKFLOW` 验证三步顺序执行、状态持久化、Retry 和 Task 状态联动；本阶段不包含 SSE 或工作台 UI。

## Structured Output

Phase 5 新增独立 Prompt Registry 和 `StructuredGenerationService`。Provider 负责单次请求、JSON 解析和 Provider 错误转换；StructuredGenerationService 负责 Prompt 构建、Zod 校验和最多两次业务级重试。

当前注册了七个版本为 1 的内容 Prompt：`content-analysis`、`hook-analysis`、`structure-analysis`、`emotion-analysis`、`optimization`、`script-generation` 和 `marketing-content`。

`StructuredContentDemoService` 只执行三个结构化步骤：`content-analysis` → `hook-analysis` → `structure-analysis`。各步骤通过 Zod 推导类型传递结果，不依赖 Markdown 解析。本阶段未新增公开 API、数据库字段或 Migration，也未实现 SSE、UI 或完整内容 Workflow。
