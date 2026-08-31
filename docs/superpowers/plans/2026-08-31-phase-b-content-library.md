# Phase B Content Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a database-backed Content Library and Content Detail flow with CRUD, URL-driven search/filtering, and atomic ContentItem plus ORIGINAL ContentVersion creation.

**Architecture:** Keep the Phase A business domain alongside the existing Task/Workflow execution domain. Extend ContentRepository and ContentService for list/detail/update/archive operations, and add a transaction-aware create path that creates ContentItem, ORIGINAL ContentVersion, and `currentVersionId` together. Add App Router API routes and focused client components under a content workspace area; the existing Workflow UI and APIs remain available and untouched.

**Tech Stack:** Next.js App Router, React, TypeScript strict, Tailwind CSS, Zod, PostgreSQL, Drizzle ORM, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-31-ai-content-workspace-2-design.md`

## Global Constraints

- Implement Phase B only: Content Library and Content Detail.
- Do not implement Workflow Integration, AI Analysis, Review Center, Approve/Reject, Regenerate, Version Compare, Dashboard, RAG, Tool Calling, MCP, Multi-Agent, OAuth, multi-tenancy, crawlers, or uploads.
- Preserve the existing Workflow Engine, LLM Provider, Structured Output, SSE, Task APIs, and Workflow debug page.
- ContentItem raw material stays in `rawContent`; ContentVersion stores only the deliverable fields `script`, `titles`, `coverCopy`, `publishCopy`, and `keywords`.
- An ORIGINAL ContentVersion is the initial editable deliverable snapshot and must not contain Analysis, Hook, Structure, Emotion, or Optimization.
- PostgreSQL remains the source of truth; React state is presentation state only.
- Use the existing Demo User convention until authentication is introduced.
- Every behavior change starts with a failing test and follows the red-green-refactor cycle.

---

### Task 1: Content domain contracts for Phase B

**Files:**
- Modify: `src/modules/content/content.schema.ts`
- Modify: `src/modules/content/content.types.ts`
- Modify: `tests/content/content-schema.test.ts`

- [ ] **Step 1: Write failing tests for create, list query, and update inputs**

Cover required title/rawContent, platform defaulting to OTHER, URL validation, tag trimming, allowed status/platform filters, and archive-only update status.

- [ ] **Step 2: Run the focused tests and verify the new assertions fail**

Run: `npm test -- tests/content/content-schema.test.ts`

Expected: FAIL because the Phase B schemas are not defined.

- [ ] **Step 3: Implement the schemas and exported input types**

Keep business status validation separate from Task and Workflow status validation. Reject client attempts to mutate processing or approval statuses through the basic content update schema.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `npm test -- tests/content/content-schema.test.ts`

Expected: PASS.

### Task 2: Content repository/service and ORIGINAL version transaction

**Files:**
- Modify: `src/modules/content/content.repository.ts`
- Modify: `src/modules/content/content.service.ts`
- Modify: `src/modules/content/content-version.service.ts`
- Create: `tests/content/content-library.service.test.ts`

- [ ] **Step 1: Write failing service tests**

Test that create calls a transaction, inserts ContentItem as DRAFT, inserts ORIGINAL ContentVersion with only deliverable keys, sets `currentVersionId`, and rolls back on failure. Test list search/filter/sort, detail lookup, basic update, and archive.

- [ ] **Step 2: Run the focused service tests and verify they fail**

Run: `npm test -- tests/content/content-library.service.test.ts`

Expected: FAIL because the repository/service methods do not exist or do not yet perform the transaction.

- [ ] **Step 3: Implement transaction-aware repository methods**

Add `createWithOriginalVersion`, `list`, `findById`, `updateBasicInfo`, and `archive`. Use `ILIKE` against title and rawContent, combine optional platform/status predicates, order by `updatedAt DESC`, and return pagination metadata. Use a single transaction for ContentItem insert, ORIGINAL version insert, and currentVersionId update.

- [ ] **Step 4: Implement service parsing and business rules**

Parse all inputs with Zod. Use the Demo User lookup for public service entry points. Archive must be idempotent and must not physically delete rows. Basic updates must reject archived records and must never change AI/Review statuses.

- [ ] **Step 5: Run focused service tests and verify they pass**

Run: `npm test -- tests/content/content-library.service.test.ts`

Expected: PASS.

### Task 3: Content API routes

**Files:**
- Create: `app/api/contents/route.ts`
- Create: `app/api/contents/[contentId]/route.ts`
- Modify: `src/lib/api/client.ts` only if a content-specific error message is required
- Create: `src/lib/api/contents.ts`
- Create: `tests/content/content-api.test.ts`

- [ ] **Step 1: Write failing route tests**

Cover GET list query forwarding, POST creation, GET detail, PATCH basic fields, DELETE archive semantics, invalid parameters returning 400, and missing content returning 404.

- [ ] **Step 2: Run the route tests and verify they fail**

Run: `npm test -- tests/content/content-api.test.ts`

Expected: FAIL because the routes do not exist.

- [ ] **Step 3: Implement route handlers using ContentService**

Keep SQL and business rules out of route files beyond request parsing/error mapping. Map `CONTENT_NOT_FOUND` to 404, validation errors to 400, invalid archive/update state to 409, and unexpected errors to 500.

- [ ] **Step 4: Implement browser API helpers**

Expose typed `listContents`, `createContent`, `getContent`, `updateContent`, and `archiveContent` functions through `requestJson`.

- [ ] **Step 5: Run route tests and verify they pass**

Run: `npm test -- tests/content/content-api.test.ts`

Expected: PASS.

### Task 4: Content Library and Content Detail pages

**Files:**
- Create: `app/contents/page.tsx`
- Create: `app/contents/[contentId]/page.tsx`
- Create: `src/components/content/content-library.tsx`
- Create: `src/components/content/content-list.tsx`
- Create: `src/components/content/content-filters.tsx`
- Create: `src/components/content/content-create-form.tsx`
- Create: `src/components/content/content-detail.tsx`
- Create: `src/components/content/content-status-badge.tsx`
- Create: `tests/content/content-pages.test.tsx`

- [ ] **Step 1: Write failing component/page tests**

Cover page title, create action, empty/loading/error states, list fields, detail header, original content, current version summary, disabled Start AI Processing placeholder, and query-string preservation for search/platform/status.

- [ ] **Step 2: Run the component tests and verify they fail**

Run: `npm test -- tests/content/content-pages.test.tsx`

Expected: FAIL because the new pages/components do not exist.

- [ ] **Step 3: Implement the Content Library page**

Use a client component for fetches and interactions. Read `search`, `platform`, and `status` from `useSearchParams`; update them with `router.replace` while preserving other query state. Render a clear empty state with “创建第一条内容”.

- [ ] **Step 4: Implement the create form**

Collect title, rawContent, platform, source, sourceUrl, and comma-separated tags. After success navigate to `/contents/:contentId`.

- [ ] **Step 5: Implement the Content Detail page**

Render title, platform, status, tags, updated time, rawContent, source, sourceUrl, current version number/source, and disabled “Start AI Processing” with copy that it will be enabled in the next phase. Allow only basic info editing. Do not render Review, full Version History, Dashboard, or Workflow execution UI.

- [ ] **Step 6: Run component tests and verify they pass**

Run: `npm test -- tests/content/content-pages.test.tsx`

Expected: PASS.

### Task 5: Route shell integration and verification

**Files:**
- Modify: `app/layout.tsx` only as required so `/contents` and `/contents/[contentId]` are not hidden behind the legacy WorkspaceShell.
- Modify: `app/globals.css` only for focused Content Library styling if required.

- [ ] **Step 1: Add a browser smoke test or documented manual smoke flow**

Verify `/contents`, create content, redirect to detail, edit basic info, archive, search, platform/status filters, refresh persistence, and empty/error states. Confirm Start AI Processing is disabled and no Workflow is started.

- [ ] **Step 2: Run lint, typecheck, full tests, build, and Drizzle checks**

Run: `npm run lint && npm run typecheck && npm test && npm run build && npm run db:check`

- [ ] **Step 3: Inspect the diff for forbidden Phase C+ leakage**

Confirm no Workflow integration, Review actions, Version History UI, Dashboard, or new AI behavior is present.

- [ ] **Step 4: Commit Phase B only**

```bash
git add app src tests docs/superpowers/plans drizzle
git commit -m "feat: add content library"
```

Keep the repository-local Git identity as `zht <764659983@qq.com>` and do not alter global Git configuration.
