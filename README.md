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
