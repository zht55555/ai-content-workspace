# AI Content Workflow Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the runnable Next.js project skeleton and PostgreSQL/Drizzle persistence foundation without implementing the Task API or AI Workflow yet.

**Architecture:** Use a modular Next.js application with clear `src/db`, `src/tasks`, `src/workflow`, `src/ai`, `src/tools`, and `src/events` boundaries. Phase 1 creates the shared configuration, Drizzle database schema, SQL migrations, generated types, and Demo User seed that later phases will consume.

**Tech Stack:** Next.js, React, TypeScript strict, Tailwind CSS, Drizzle ORM, Drizzle Kit, PostgreSQL, Zod, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-ai-content-workflow-design.md`

## Global Constraints

- The first version uses a modular monolith and a persistent Node.js process.
- The first version uses a Demo User and does not implement authentication.
- Workflow, Task, Persistence, LLM Provider, Prompt, Tool, and SSE/Event remain separate modules.
- No business logic is placed in a single Route Handler.
- TypeScript strict mode is enabled.
- No Multi-Agent, RAG, MCP, vector database, complex RBAC, or external business-system integration is added in this phase.

---

### Task 1: Initialize the application skeleton

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `next-env.d.ts`
- Create: `app/layout.tsx`
- Create: `app/page.tsx`
- Create: `app/globals.css`
- Create: `src/lib/env.ts`
- Create: `.gitignore`

**Interfaces:**
- Produces a bootable Next.js application with strict TypeScript and a typed environment configuration entry point.

- [ ] **Step 1: Add the minimal project manifest and scripts**

Define scripts for `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `db:generate`, `db:migrate`, and `db:seed`. Add only dependencies required by the approved architecture: Next.js, React, Drizzle ORM, Drizzle Kit, `pg`, Zod, Tailwind tooling, and Vitest.

- [ ] **Step 2: Add the minimal root layout and placeholder page**

Create a server-rendered root layout with language metadata and a placeholder page that identifies the application as `AI Content Workflow`. Do not build the three-column workspace in this phase.

- [ ] **Step 3: Configure strict TypeScript and base styling**

Enable `strict: true`, use the Next.js plugin, configure path alias `@/*` to the project root, and add only the base CSS reset and color variables needed for later UI work.

- [ ] **Step 4: Add typed environment parsing**

Create `src/lib/env.ts` with a Zod schema for `DATABASE_URL`, optional real-provider configuration, `LLM_PROVIDER`, and workflow limit defaults. Export a parsed server-only configuration object. The parser must allow the Demo Provider when no real API key exists.

- [ ] **Step 5: Verify the skeleton**

Run:

```text
npm run typecheck
npm run lint
npm run build
```

Expected: all commands pass and the placeholder page builds successfully.

- [ ] **Step 6: Commit the skeleton**

```text
git add package.json tsconfig.json next.config.ts next-env.d.ts app src/lib/env.ts .gitignore
git commit -m "chore: initialize ai content workflow app"
```

### Task 2: Add Drizzle schema and persistence client

**Files:**
- Create: `src/db/schema.ts`
- Create: `drizzle.config.ts`
- Create: `src/db/client.ts`
- Create: `src/db/types.ts`
- Modify: `package.json`

**Interfaces:**
- Produces Drizzle table definitions for `User`, `Task`, `TaskInput`, `WorkflowRun`, `WorkflowStep`, `AnalysisResult`, `PromptTemplate`, and `LLMUsage`.
- Produces a singleton Drizzle client exported from `src/db/client.ts`.

- [ ] **Step 1: Write the schema contract test**

Add a test that checks the Drizzle schema exports all eight required tables and that the enum definitions include the approved Task and WorkflowStep states.

- [ ] **Step 2: Run the test before implementation**

Run:

```text
npm test -- tests/db/schema-contract.test.ts
```

Expected: FAIL because the Drizzle schema and client do not exist yet.

- [ ] **Step 3: Define the Drizzle schema**

Implement the approved relations and enums in `src/db/schema.ts`. Use PostgreSQL JSONB columns for structured step inputs, step outputs, and final results. Add indexes for `Task.userId`, `Task.updatedAt`, `WorkflowRun.taskId`, and `WorkflowStep.workflowRunId`. Add unique constraints for `(workflowRunId, stepKey)` and `(promptKey, version)`.

- [ ] **Step 4: Implement the Drizzle client singleton**

Export one Drizzle client backed by `pg` in development-safe fashion so hot reload does not create unbounded connections. Keep this module free of Task or Workflow behavior.

- [ ] **Step 5: Add domain-facing database types**

Export type aliases inferred from Drizzle table definitions and JSON-compatible values without duplicating database enum strings in unrelated modules.

- [ ] **Step 6: Generate and run the contract test**

Run:

```text
npx drizzle-kit check
npm test -- tests/db/schema-contract.test.ts
npm run typecheck
```

Expected: the test passes and the generated client typechecks.

- [ ] **Step 7: Commit the persistence foundation**

```text
git add src/db drizzle.config.ts package.json package-lock.json tests/db/schema-contract.test.ts
git commit -m "feat: add drizzle persistence foundation"
```

### Task 3: Add database configuration, migration, and Demo User seed

**Files:**
- Create: `.env.example`
- Create: `src/db/seed.ts`
- Create: `drizzle/0000_init.sql`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Produces a reproducible local database initialization flow.
- Produces one stable Demo User identified by a documented seed email.

- [ ] **Step 1: Add environment documentation**

Document `DATABASE_URL`, `LLM_PROVIDER`, and the optional real-provider key/model variables. State that leaving real-provider variables empty selects Demo Provider.

- [ ] **Step 2: Add the seed test**

Add a test that runs the seed against an isolated test database and verifies exactly one Demo User exists with the expected stable email and no Task records are created by the seed.

- [ ] **Step 3: Run the seed test before implementation**

Run:

```text
npm test -- tests/db/seed.test.ts
```

Expected: FAIL because the seed and migration are not available.

- [ ] **Step 4: Implement an idempotent seed**

Use an upsert keyed by the stable Demo User email through Drizzle. The seed must be safe to run repeatedly and must not delete user-created records.

- [ ] **Step 5: Create and apply the initial migration**

Run:

```text
npm run db:generate
npm run db:migrate
npm run db:seed
```

Expected: all tables and enums are created, and the seed completes without duplicate-user errors.

- [ ] **Step 6: Update the setup README**

Document PostgreSQL startup, environment file creation, migration, seed, development server startup, lint, typecheck, test, and build commands. Do not document endpoints that do not exist yet.

- [ ] **Step 7: Verify persistence from a clean database**

Run:

```text
npx drizzle-kit check
npm test -- tests/db/seed.test.ts
npm run typecheck
npm run lint
```

Expected: migration status is up to date and all checks pass.

- [ ] **Step 8: Commit the database initialization**

```text
git add .env.example drizzle src/db README.md package.json package-lock.json tests/db/seed.test.ts
git commit -m "feat: add database migration and demo user seed"
```

### Task 4: Add Phase 1 verification and handoff documentation

**Files:**
- Create: `tests/setup.ts`
- Create: `tests/smoke/app-smoke.test.ts`
- Modify: `README.md`

**Interfaces:**
- Produces a repeatable Phase 1 verification command set for later phases.

- [ ] **Step 1: Add the application smoke test**

Verify that the project imports its root configuration, the database client module can be imported, and the expected schema files are present. Keep the test independent of browser rendering and real LLM credentials.

- [ ] **Step 2: Configure Vitest test setup**

Add a setup file that loads test environment values without mutating production configuration and configures the path alias used by source imports.

- [ ] **Step 3: Run all Phase 1 checks**

Run:

```text
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all checks pass; no Task API, Workflow execution, or real LLM call is expected in this phase.

- [ ] **Step 4: Update the README with Phase 1 scope**

State explicitly that Phase 1 delivers the project skeleton and persistence foundation, while Task execution, Workflow nodes, SSE, and AI Providers are implemented in later phases.

- [ ] **Step 5: Commit the verified Phase 1 foundation**

```text
git add tests README.md
git commit -m "test: verify phase one project foundation"
```

## Phase 1 Exit Criteria

- A fresh checkout can install dependencies and build.
- PostgreSQL migration creates all approved Phase 0 tables and enums.
- Seed is idempotent and creates the Demo User.
- No API Key is required for the project to start.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass.
- No business Workflow or full UI implementation has been started.
