# AI Content Workspace 2.0 改造设计

## 1. 目标与边界

AI Content Workspace 2.0 将现有的 AI Workflow Demo 升级为面向 2～20 人内容团队的内容生产、审核与版本管理工作台。

本次改造采用“新增业务域、复用执行域”的方式：保留现有 Task、WorkflowRun、WorkflowStep、WorkflowEngine、LLM Provider、StructuredGenerationService、Zod、AnalysisResult 与 SSE，不推倒重写。

第一阶段覆盖以下闭环：

```text
Content → AI Processing → Human Review → Revision → Approved
```

不在本阶段实现爬虫、自动发布、RAG、向量数据库、Agent、OAuth、多租户、复杂权限或多人实时协同。

## 2. 当前架构结论

现有执行链路已经具备良好的基础：

```text
Task → WorkflowRun → WorkflowStep → AnalysisResult
                         ↓
                    SSE Snapshot
```

现有 WorkflowEngine 负责执行编排、状态持久化、Retry、错误处理和事件发布；StructuredGenerationService 负责 Prompt 构建、JSON 解析、Zod 校验和修复重试。这些边界继续保留。

当前需要补足的是业务内容对象、业务状态、可编辑交付物、审核记录和版本历史。Task 不改名为 Content：Task 表示一次 AI 执行意图，ContentItem 表示团队管理的内容资产。

现有 UI 的主要调整点是：Dashboard 和 Content Library 成为业务入口；Workflow Timeline 移入 Content Detail 的 Execution Detail；Script Studio、Review 和 Version History 成为主要工作区。

## 3. 最终领域模型

```text
User
 └── ContentItem
      ├── Task
      │    └── TaskInput
      │         └── WorkflowRun
      │              ├── WorkflowStep
      │              └── AnalysisResult
      ├── ContentVersion
      └── Review

ContentVersion ← Review
```

关系：

- User 1:N ContentItem
- ContentItem 1:N Task
- Task 1:1 TaskInput
- Task 1:N WorkflowRun
- WorkflowRun 1:N WorkflowStep
- WorkflowRun 1:1 AnalysisResult
- ContentItem 1:N ContentVersion
- ContentItem 1:N Review
- Review N:1 ContentVersion
- Review 不再拆出 ReviewComment；审核意见直接保存在 Review.note。

### ContentItem

业务内容资产，保存原始素材和当前业务状态。字段包括：`id`、`userId`、`title`、`rawContent`、`source`、`platform`、`sourceUrl`、`tags`、`status`、`lastError`、`currentVersionId`、`createdAt`、`updatedAt`。

### Task

一次 AI 处理任务。保留现有 `contentType`、TaskInput、技术状态和历史执行语义，新增 `contentItemId`。同一 ContentItem 可以拥有多次 Task，以支持 Regenerate 和失败重试。

### AnalysisResult

保存 AI 分析类结果，不作为最终可编辑交付物版本：

- Analysis
- Hook
- Structure
- Emotion
- Optimization

继续由现有 WorkflowFinalizationService 使用 `ContentAnalysisResultSchema` 校验后写入。一个 WorkflowRun 最多对应一个 AnalysisResult。

### ContentVersion

保存真正需要编辑、审核和最终发布的 Deliverable，而不是整个 AnalysisResult JSON。主要内容包括：

- Script
- Titles
- Cover Copy
- Publish Copy
- Keywords

ContentVersion 通过 `analysisResultId` 和 `workflowRunId` 追溯生成来源，但不复制分析类字段作为版本正文。

### Review

一次针对具体 ContentVersion 的审核记录。Review 必须回答：谁审核、何时审核、审核哪个版本、决策是什么、审核意见是什么。Review 不绑定 WorkflowRun，也不直接审核整个 AnalysisResult。

## 4. ContentVersion Schema

ContentVersion 的 `contentJson` 使用独立的 Zod Schema，示意结构如下：

```ts
const ContentDeliverableSchema = z.object({
  script: z.string(),
  titles: z.array(z.string()),
  coverCopy: z.array(z.string()),
  publishCopy: z.string(),
  keywords: z.array(z.string()),
});
```

实际实现时保留 schema version 字段，以支持后续交付物结构演进：

```ts
type ContentVersionPayload = {
  schemaVersion: "content-deliverable.v1";
  script: string;
  titles: string[];
  coverCopy: string[];
  publishCopy: string;
  keywords: string[];
};
```

数据库字段：

| 字段 | 说明 |
|---|---|
| `id` | 版本 ID |
| `contentItemId` | 所属内容 |
| `versionNumber` | 同一内容内递增版本号 |
| `source` | `ORIGINAL`、`AI_GENERATED`、`HUMAN_EDIT`、`AI_REGENERATED` |
| `createdBy` | 创建人 |
| `baseVersionId` | 人工编辑或再生成所基于的版本 |
| `workflowRunId` | AI 生成来源，可为空 |
| `analysisResultId` | 关联的 AI 分析结果，可为空 |
| `contentJson` | 经过 Zod 校验的 Deliverable 快照 |
| `isFinal` | 是否为 Final Version |
| `createdAt` | 创建时间 |

约束：

- `unique(contentItemId, versionNumber)`。
- 同一 ContentItem 最多一个 `isFinal = true` 的版本，使用部分唯一索引。
- `workflowRunId` 允许为空，因为人工编辑版本没有新的 WorkflowRun。
- 创建新版本时携带 `baseVersionId`，服务端检查当前版本，失败返回 `409 VERSION_CONFLICT`。
- 已审核版本不可原地修改；任何修改都创建新版本。

版本示例：

```text
V1 ORIGINAL
V2 AI_GENERATED
V3 HUMAN_EDIT
V4 AI_REGENERATED
V5 HUMAN_EDIT / APPROVED
```

## 5. 数据库改造

### 新增枚举

- `content_platform`: `DOUYIN`、`XIAOHONGSHU`、`BILIBILI`、`WECHAT`、`OTHER`
- `content_status`: `DRAFT`、`AI_PROCESSING`、`WAITING_REVIEW`、`NEEDS_REVISION`、`APPROVED`、`REJECTED`、`PUBLISHED`、`ARCHIVED`
- `content_version_source`: `ORIGINAL`、`AI_GENERATED`、`HUMAN_EDIT`、`AI_REGENERATED`
- `review_decision`: `APPROVED`、`NEEDS_REVISION`、`REJECTED`

### 新增表

1. `content_items`
   - 内容标题、原始文本、来源、平台、URL、标签、业务状态、错误、当前版本。
   - 索引：`(user_id, updated_at)`、`(user_id, status)`、`(user_id, platform)`。

2. `content_versions`
   - 交付物快照、来源、版本号、创建人和追溯关系。
   - 唯一约束：`(content_item_id, version_number)`。
   - 部分唯一索引：每个 ContentItem 一个 Final Version。

3. `reviews`
   - `contentItemId`、`contentVersionId`、`reviewerId`、`decision`、`note`、`createdAt`、`updatedAt`。
   - 索引：`(contentItemId, createdAt)`、`(contentVersionId, createdAt)`。

### 既有表调整

- `tasks` 新增 `contentItemId` 外键和索引。
- `analysis_results` 第一版不新增 `contentItemId`，通过 `AnalysisResult → Task → ContentItem` 追溯。
- 不删除或重命名现有 Task、WorkflowRun、WorkflowStep 字段。
- 暂不生成或执行 Migration，直到进入 Phase A 实施。

## 6. 状态机

### Content Business Status

```text
DRAFT ───────────────→ AI_PROCESSING
  ↑                         │
  │                         ├── success → WAITING_REVIEW
  │                         └── first processing failure → DRAFT
  │
  └── regenerate failure ← AI_PROCESSING

WAITING_REVIEW ───────→ APPROVED
       │                    │
       ├── request revision → NEEDS_REVISION
       └── reject → REJECTED

NEEDS_REVISION ───────→ AI_PROCESSING  (Regenerate)
       │
       └────────────────→ APPROVED     (直接审核当前新版本)

APPROVED → PUBLISHED → ARCHIVED
```

关键失败规则：

- 首次 AI Processing 失败：`AI_PROCESSING → DRAFT`。
- Regenerate 失败：恢复到启动 Regenerate 前的业务状态，例如 `WAITING_REVIEW` 或 `NEEDS_REVISION`。
- Regenerate 失败时不删除、不替换当前有效 ContentVersion。
- 每次 Processing 开始前保存 `previousBusinessStatus` 和 `currentVersionId`，失败时原子恢复。
- 不新增 `AI_FAILED` 状态；错误保存在 `lastError` 和 WorkflowRun.errorMessage。

### Workflow Technical Status

```text
PENDING → QUEUED → RUNNING → COMPLETED
                         ├── FAILED
                         └── CANCELLED
```

两种状态的映射：

| WorkflowRun | ContentItem |
|---|---|
| `PENDING/QUEUED/RUNNING` | `AI_PROCESSING` |
| `COMPLETED` | `WAITING_REVIEW` |
| `FAILED` 首次处理 | `DRAFT` |
| `FAILED` Regenerate | 恢复前置业务状态 |
| `CANCELLED` | 恢复前置业务状态 |

Workflow 完成不等于内容批准。只有 Review 针对具体 ContentVersion 做出 `APPROVED` 决策后，ContentItem 才能进入 `APPROVED`。

## 7. 端到端业务流程

### 首次创建与处理

```text
POST /api/contents
  ↓
创建 ContentItem = DRAFT
  ↓
创建 V1 = ORIGINAL
  ↓
POST /api/contents/:id/process
  ↓
创建 Task + TaskInput
  ↓
ContentItem = AI_PROCESSING
  ↓
复用 WorkflowEngine 创建 WorkflowRun / Steps
  ↓
Snapshot + SSE 展示执行进度
  ↓
Workflow 完成并写入 AnalysisResult
  ↓
从 AnalysisResult 的 generatedScript / marketing 提取 Deliverable
  ↓
创建 V2 = AI_GENERATED
  ↓
ContentItem = WAITING_REVIEW
```

### 人工编辑与审核

```text
编辑当前 Deliverable
  ↓
创建 HUMAN_EDIT 新版本
  ↓
ContentItem = WAITING_REVIEW
  ↓
POST /api/contents/:id/reviews
  ↓
Review 绑定 contentVersionId
  ↓
APPROVED / NEEDS_REVISION / REJECTED
```

### Regenerate

```text
WAITING_REVIEW 或 NEEDS_REVISION
  ↓ 保存前置状态和当前版本
创建新的 Task + WorkflowRun
  ↓
ContentItem = AI_PROCESSING
  ↓
成功：创建 AI_REGENERATED 新版本，进入 WAITING_REVIEW
失败：恢复前置业务状态，保留当前有效版本
```

### 读取规则

- AI 分析区域读取 `AnalysisResult`。
- Script Studio、Review 和 Final Content 读取当前 `ContentVersion`。
- Execution Detail 读取 `WorkflowRun` 和 `WorkflowStep`。
- 任何前端页面刷新时，先读取 PostgreSQL Snapshot，再连接 SSE 增量事件。

## 8. API 规划

```text
GET    /api/contents
POST   /api/contents
GET    /api/contents/:contentId
PATCH  /api/contents/:contentId
DELETE /api/contents/:contentId

POST   /api/contents/:contentId/process
GET    /api/contents/:contentId/tasks
GET    /api/contents/:contentId/runs/latest

GET    /api/contents/:contentId/versions
GET    /api/contents/:contentId/versions/:versionId
POST   /api/contents/:contentId/versions
POST   /api/contents/:contentId/versions/:versionId/finalize

GET    /api/reviews
GET    /api/contents/:contentId/reviews
POST   /api/contents/:contentId/reviews
```

现有 Task、WorkflowRun、SSE 和 AnalysisResult API 保留，新的 Content API 负责把业务对象接入现有执行系统。

## 9. 页面与组件边界

- Dashboard：状态汇总和最近内容。
- Content Library：列表、搜索、平台/状态/标签筛选。
- Content Detail：内容 Header、Original Content、AI Analysis、Script Studio、Review、Version History、Execution Detail。
- Review Center：待审核、需修改、最近审核内容。
- Workflow Execution Detail：复用现有 Snapshot + SSE Timeline、Retry、错误和用量信息。

建议组件域：

```text
src/components/content/
src/components/review/
src/components/version/
src/components/dashboard/
src/components/workflow/
```

Script Studio 不允许直接编辑整段 JSON；应按脚本、标题、封面文案、发布文案、关键词分字段编辑，并保存为 HUMAN_EDIT 版本。

## 10. 错误与边界

- Workflow Failed：按照首次处理或 Regenerate 分别恢复状态。
- 已审核版本不可覆盖，只能创建新版本并重新审核。
- Review 必须校验 `contentVersionId` 属于当前 ContentItem。
- 旧版本 Review 不得改变当前版本状态。
- 版本创建使用 `baseVersionId` 做乐观锁，冲突返回 `409 VERSION_CONFLICT`。
- AI Processing 中禁止删除，避免留下孤立执行记录。
- 删除优先使用 `ARCHIVED`，保留执行和审核历史。
- SSE 断线后重新读取 Workflow Snapshot，不能依赖浏览器内存状态恢复。

## 11. 分阶段实施计划

### Phase A：领域模型与状态机

新增表、枚举、Zod Schema、类型、Repository、Service 和业务状态规则；补充状态机、版本约束和失败恢复测试。暂不改主要页面。

### Phase B：Content Library

实现内容创建、列表、搜索、筛选、详情、Original Version 和 ContentItem 基础 API。

### Phase C：AI Processing Integration

从 ContentItem 创建 Task，接入现有 WorkflowEngine；完成后写入 AnalysisResult、AI_GENERATED ContentVersion，并正确处理首次失败和 Regenerate 失败恢复。

### Phase D：Content Detail + Script Studio + Version History

实现内容详情工作区、分析与交付物分离展示、分字段编辑、人工版本、版本详情和字段级 Diff。

### Phase E：Review

实现 Review 表、决策、审核备注、Approve、Request Revision、Reject、Regenerate，并确保 Review 绑定具体 ContentVersion。

### Phase F：Dashboard / Review Center

将首页改为业务 Dashboard，增加内容状态汇总、最近内容和待审核入口；Workflow Timeline 移入 Execution Detail。

### Phase G：Reliability

补充失败恢复、版本冲突、重复审核、刷新、SSE 重连、删除边界、错误状态和生产构建验证。

每个阶段运行 lint、typecheck、tests 和 production build；不得通过删除现有测试降低门槛。

## 12. 产品展示完成标准

第一版达到以下程度即可作为真实可展示的 AI 产品：

```text
创建内容
→ 内容库管理
→ AI 处理与实时进度
→ 查看结构化分析
→ 编辑 Script Studio 交付物
→ 创建版本
→ 针对具体版本审核
→ 退回修改或批准
→ 查看完整版本历史
```

这条闭环同时体现了 AI 应用前端的状态管理、实时数据、结构化编辑、版本控制、审核流程、错误恢复和持久化路由能力。
