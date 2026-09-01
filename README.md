# AI Content Workspace

一个面向内容创作者、内容运营和小型内容团队的 AI 内容生产工作台。它把“原始素材 → AI 分析 → 可编辑交付物 → 人工审核 → 最终版本”收进同一条可追踪的业务流程，解决素材分散、AI 结果难以落地、审核上下文丢失和版本覆盖等问题。

## 产品定位

这是一个以内容业务对象为中心的 AI Workspace Demo：AI 负责分析和生成建议，人负责编辑、判断和批准。产品入口是 Dashboard、Content Library 和 Review Center；Task / Workflow 页面仍保留，用于技术执行诊断，但不再是产品主入口。

## 核心流程

```text
创建 ContentItem
  → ORIGINAL Version
  → AI Processing（Task + Workflow + SSE）
  → AnalysisResult + AI_GENERATED Version
  → Human Edit（HUMAN_EDIT Version）
  → Review
  → Request Revision / Regenerate 或 Approve
  → Final Version
```

## 功能模块

- **Dashboard**：从 PostgreSQL 聚合 Draft、AI Processing、Waiting Review、Needs Revision、Approved，以及最近内容、待审核内容和最近完成内容。
- **Content Library**：创建、搜索、Platform / Status 筛选、编辑、归档和查看详情。
- **Content Detail**：Original Content、只读 AI Analysis、Script Studio、Review、Version History、五字段 Before / After Compare、Execution Detail。
- **Review Center**：集中找到 Waiting Review、Needs Revision、Recently Approved、Recently Rejected 内容；具体审核动作复用 Content Detail 的 Review API。
- **Workflow Execution**：Task、WorkflowRun、WorkflowStep、Structured Output、Retry 和 SSE 技术诊断页面。

## 数据与版本职责

- `ContentItem` 保存业务对象、原始素材、业务状态和当前版本指针。
- `AnalysisResult` 保存 AI 分析结果：Analysis、Hook、Structure、Emotion、Optimization。
- `ContentVersion` 只保存可编辑和待发布 Deliverable：Script、Titles、Cover Copy、Publish Copy、Keywords。每个 AI 或人工结果都是新版本，不覆盖旧版本。
- `Review` 必须绑定具体 `ContentVersion`，保留每次审核的 decision 和 note 历史。

## 技术架构

- Next.js App Router + React + TypeScript strict
- PostgreSQL + Drizzle ORM
- 领域服务 / Repository 分层，业务状态转换集中在 Content State Machine
- `WorkflowEngine` 负责技术执行，`StructuredGenerationService` 负责 Prompt 组装和 Zod 结构化校验
- `DemoProvider` 和 `DeepSeekProvider` 共享 `LLMProvider` 抽象
- Content Business Status 与 Task / Workflow Technical Status 分离

## AI Workflow 与 Human-in-the-loop

`FULL_CONTENT_ANALYSIS` 按固定顺序执行七步：Content Analysis、Hook、Structure、Emotion、Optimization、Script Generation、Marketing Content。最终完整结果写入 `AnalysisResult`；从结果中提取 Deliverable 写入 `ContentVersion`。

人工编辑使用 `baseVersionId` 乐观锁。当前版本已变化时返回 `409 VERSION_CONFLICT`，不会静默覆盖。审核只允许针对当前版本，Approve 会把该版本标记为唯一 Final；Request Revision 和 Reject 保留全部版本与审核历史。

## SSE / Snapshot

详情页先读取持久化 Snapshot，再通过 SSE 接收增量事件。Snapshot 是刷新和断线恢复的权威来源，SSE 只提供实时体验；连接断开后页面仍可通过重新读取 Snapshot 恢复状态。Workflow Timeline 只作为 Content Detail 的 Execution Detail 辅助区域。

## 启动项目

环境要求：Node.js 22+、npm 10+、PostgreSQL 14+。

```bash
npm install
cp .env.example .env
# 在 .env 中设置 DATABASE_URL
npm run db:migrate
npm run db:seed
npm run dev
```

打开 <http://localhost:3000>。

常用检查：

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run db:check
```

## Provider 配置

默认使用无需密钥的 DemoProvider：

```env
LLM_PROVIDER=demo
```

使用 DeepSeek：

```env
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=你的密钥
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

可设置 `DEMO_DELAY_MS=500` 观察异步 Processing 和 SSE 状态。

## 架构限制与未来方向

当前 Demo 使用 Demo User 和单进程内事件总线，未实现登录、多租户、OAuth、权限系统、自动发布、爬虫、文件或音视频上传。未来可以在明确产品需求后增加身份与权限、持久化事件存储、发布渠道适配和更强的搜索能力；RAG、MCP、Tool Calling、Multi-Agent、向量数据库等不属于当前产品闭环。
