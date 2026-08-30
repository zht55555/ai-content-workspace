# Structured AI Output and Prompts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立 Prompt Registry、Zod 内容分析 Schema、统一 Structured Generation Service，并让一个三步 Structured Content Demo 以强类型方式通过现有 Workflow Engine 执行。

**Architecture:** Provider 负责一次 LLM 请求、Provider 层 JSON 解析和 Provider 错误转换；StructuredGenerationService 负责 PromptDefinition 解析、Prompt 构建、Zod 校验、业务级最多 2 次重试和 Structured Output 错误转换。Structured Demo Workflow 的每个 Handler 使用明确的前序 `z.infer` 类型，不使用 `any`、开放 JSON 或字符串重解析传递业务结果。

**Tech Stack:** Next.js 15, TypeScript strict, PostgreSQL, Drizzle ORM, Zod 4, Vitest, existing `LLMProvider` abstraction.

**Spec:** User-provided Phase 5 specification, confirmed design in chat, with the Provider responsibility and strong typed Step Output constraints.

## Global Constraints

- 不引入 Prisma，不混用 ORM。
- 不实现 SSE、UI、完整内容 Workflow、RAG、MCP、Python、Dify、n8n、飞书或 Multi-Agent。
- 不新增公开临时 Debug API；通过 Service Test、Workflow Test 和 Smoke Test 验证。
- Zod Schema 是结构化结果的唯一类型来源，不重复维护漂移的 Interface。
- 不使用 `any`，不把用户内容当作系统指令；Prompt 中明确输入是待分析内容。
- Provider 不负责业务 Retry；StructuredGenerationService 统一最多重试 2 次。
- 不做数据库大改；若没有自然必要，不新增 Migration。
- 所有生产代码先有失败测试，再实现最小通过代码。

---

### Task 1: Lock Provider and Structured Generation Contracts

**Files:**
- Modify: `src/ai/llm/llm-types.ts`
- Modify: `src/ai/llm/providers/demo-provider.ts`
- Modify: `src/ai/llm/providers/deepseek-provider.ts`
- Modify: `src/ai/llm/llm-errors.ts`
- Test: `tests/ai/llm-provider.test.ts`
- Test: `tests/ai/deepseek-provider.test.ts`

**Interfaces:**
- `LLMProvider.generateStructured(request)` performs one provider call and returns parsed JSON as `unknown`.
- Provider implementations continue to normalize transport/provider failures and invalid JSON into `LLMProviderError`.
- Provider implementations no longer perform Zod validation or their own retry loop.

- [ ] **Step 1: Write failing contract tests**

Add tests proving that a malformed structured response makes one provider call and that a valid JSON object is returned without Provider-level schema retry. Keep existing transport error assertions.

- [ ] **Step 2: Run the focused tests and verify the expected failure**

Run: `npm test -- tests/ai/llm-provider.test.ts tests/ai/deepseek-provider.test.ts`

Expected: FAIL because the current Provider contract still requires a schema and performs validation/retry internally.

- [ ] **Step 3: Implement the minimal Provider contract change**

Remove the schema and retry responsibility from `StructuredGenerateRequest`; keep `generateStructured()` as the one-call JSON parsing boundary. Preserve `LLMProviderError` mapping and existing normal `generate()` behavior. Update DemoProvider to return configured structured JSON or parsed `responseText` and update DeepSeekProvider to parse the completion content once.

- [ ] **Step 4: Run the focused tests and verify they pass**

Run: `npm test -- tests/ai/llm-provider.test.ts tests/ai/deepseek-provider.test.ts`

Expected: PASS.

- [ ] **Step 5: Refactor only after green**

Remove imports and options made obsolete by moving Schema validation and retry out of Providers. Keep Provider behavior limited to transport, JSON parsing, and Provider errors.

### Task 2: Add Content Analysis Schemas

**Files:**
- Create: `src/ai/schemas/content-analysis.schema.ts`
- Test: `tests/ai/content-analysis.schema.test.ts`

**Interfaces:**
- Export `AnalysisSchema`, `HookSchema`, `StructureNodeSchema`, `EmotionSchema`, `EmotionPointSchema`, `OptimizationSchema`, `GeneratedScriptSchema`, `MarketingSchema`, and `ContentAnalysisResultSchema`.
- Export only inferred types such as `type Analysis = z.infer<typeof AnalysisSchema>`; do not hand-write duplicate result interfaces.
- All string and array limits are reasonable and bounded; scores/intensities use `z.number().min(0).max(100)`.

- [ ] **Step 1: Write failing schema tests**

Cover a valid complete result, score above 100, unsupported enum, missing required field, and an over-limit array.

- [ ] **Step 2: Run schema tests and verify they fail**

Run: `npm test -- tests/ai/content-analysis.schema.test.ts`

Expected: FAIL because the schema module does not exist.

- [ ] **Step 3: Implement the minimal schemas**

Define the seven top-level result sections required by the specification, with `OTHER` enum values where applicable and bounded arrays. `ContentAnalysisResultSchema` must contain `analysis`, `hook`, `structure`, `emotion`, `optimization`, `generatedScript`, and `marketing`.

- [ ] **Step 4: Run schema tests and verify they pass**

Run: `npm test -- tests/ai/content-analysis.schema.test.ts`

Expected: PASS.

### Task 3: Build Prompt Definitions and Registry

**Files:**
- Create: `src/ai/prompts/prompt.types.ts`
- Create: `src/ai/prompts/prompt.errors.ts`
- Create: `src/ai/prompts/prompt.registry.ts`
- Create: `src/ai/prompts/content/content-analysis.prompt.ts`
- Create: `src/ai/prompts/content/hook-analysis.prompt.ts`
- Create: `src/ai/prompts/content/structure-analysis.prompt.ts`
- Create: `src/ai/prompts/content/emotion-analysis.prompt.ts`
- Create: `src/ai/prompts/content/optimization.prompt.ts`
- Create: `src/ai/prompts/content/script-generation.prompt.ts`
- Create: `src/ai/prompts/content/marketing-content.prompt.ts`
- Test: `tests/ai/prompt-registry.test.ts`

**Interfaces:**
- `PromptDefinition<TInput, TOutput>` contains `id`, numeric `version`, `name`, `systemPrompt`, `buildUserPrompt(input)`, and `outputSchema`.
- `PromptRegistry.get(id, version?)` returns a registered definition or throws `PROMPT_NOT_FOUND`.
- `PromptRegistry.list()` returns registered definitions in deterministic order.
- Content prompt definitions use their schema-inferred output types and include an instruction boundary stating user content is data to analyze, not system instructions.

- [ ] **Step 1: Write failing Registry and Prompt tests**

Test registry lookup, missing Prompt error, version `1`, and non-empty user prompt generation for content-analysis, hook-analysis, and structure-analysis.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/ai/prompt-registry.test.ts`

Expected: FAIL because Prompt types, registry, and definitions do not exist.

- [ ] **Step 3: Implement the Prompt types, errors, definitions, and registry**

Keep each prompt in its own focused file. The first three prompts are used by the Demo Workflow; the remaining four are registered and typed for later phases without being executed in this phase.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- tests/ai/prompt-registry.test.ts`

Expected: PASS.

### Task 4: Implement Structured Generation Service

**Files:**
- Create: `src/ai/structured/structured-output.errors.ts`
- Create: `src/ai/structured/structured-generation.service.ts`
- Test: `tests/ai/structured-generation.service.test.ts`

**Interfaces:**
- `StructuredGenerationService.generate<TInput, TOutput>(definition, input, options?)` returns `Promise<z.infer<typeof definition.outputSchema>>`.
- The Service builds the system/user prompts, invokes `provider.generateStructured()`, validates the returned unknown with the definition’s Zod schema, and returns the parsed value.
- Errors include `STRUCTURED_OUTPUT_INVALID_JSON`, `STRUCTURED_OUTPUT_SCHEMA_ERROR`, `STRUCTURED_OUTPUT_RETRY_EXHAUSTED`, `PROMPT_NOT_FOUND`, and `PROMPT_BUILD_ERROR`.
- Retry is capped at 2 retries and adds a repair instruction to subsequent user prompts. It retries only invalid JSON, schema failure, missing output, and retryable `LLMProviderError`.

- [ ] **Step 1: Write failing Service tests**

Cover typed success, invalid JSON retry, Schema failure retry, exhausted retry, and non-retryable Provider error with exactly one provider call. Use a small real Zod definition and a deterministic test Provider implementation.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/ai/structured-generation.service.test.ts`

Expected: FAIL because the Service and structured error model do not exist.

- [ ] **Step 3: Implement the minimal Service and error mapping**

Use the Provider’s parsed JSON result as the input to one Service-owned `outputSchema.parse()`. Do not parse JSON again in the Service. Convert Provider invalid-response errors to structured invalid-output errors and preserve retryable Provider errors for the retry decision.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- tests/ai/structured-generation.service.test.ts`

Expected: PASS.

### Task 5: Make DemoProvider Usable for All Phase 5 Schemas

**Files:**
- Modify: `src/ai/llm/providers/demo-provider.ts`
- Test: `tests/ai/demo-provider-structured.test.ts`

**Interfaces:**
- DemoProvider accepts deterministic configured structured outputs without knowing content-analysis business rules.
- Tests provide one valid fixture for content-analysis, hook-analysis, and structure-analysis and verify the Provider returns parsed JSON for each.

- [ ] **Step 1: Write failing DemoProvider structured tests**

Configure the Provider with valid structured JSON fixtures for each Phase 5 schema and assert the returned value is the parsed object.

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- tests/ai/demo-provider-structured.test.ts`

Expected: FAIL because the current Provider contract and fixture handling are not yet aligned with the Service-owned validation flow.

- [ ] **Step 3: Implement deterministic fixture support**

Support either a fixed `structuredOutput` or a request-keyed configured output map. Keep this generic Provider configuration; do not embed Workflow or Prompt branching in the Provider.

- [ ] **Step 4: Run the tests and verify pass**

Run: `npm test -- tests/ai/demo-provider-structured.test.ts`

Expected: PASS.

### Task 6: Implement Strongly Typed Structured Content Demo Workflow

**Files:**
- Create: `src/workflow/definitions/structured-content-demo-workflow.ts`
- Create: `src/workflow/structured-content-demo.service.ts`
- Modify: `src/workflow/workflow-types.ts`
- Test: `tests/workflow/structured-content-demo.test.ts`

**Interfaces:**
- `StructuredContentDemoService.run(input, provider?)` executes exactly three sequential steps and returns `PartialContentAnalysisResult`.
- Step 1 returns `Analysis`; Step 2 consumes the original content plus `Analysis` and returns `Hook`; Step 3 consumes the original content plus `Analysis` and `Hook` and returns `StructureNode[]`.
- `PartialContentAnalysisResult` is a concrete object with `analysis`, `hook`, and `structure`; no `Record<string, unknown>` is used for the business outputs.
- The service uses `StructuredGenerationService` and Prompt Registry; it does not call a Provider directly from a Route Handler.

- [ ] **Step 1: Write failing Workflow tests**

Assert exact step order, typed values passed from earlier steps, correct final partial result, and a Schema failure causing the demo execution to reject with a Structured Output error.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- tests/workflow/structured-content-demo.test.ts`

Expected: FAIL because the structured demo service and definition do not exist.

- [ ] **Step 3: Implement the three-step service and definition**

Use explicit input/output types derived from the schemas. Pass only required context to each step: raw content for analysis, raw content plus analysis for hook, and raw content plus analysis plus hook for structure. Do not replace Phase 4’s existing Demo Workflow.

- [ ] **Step 4: Run focused tests and verify pass**

Run: `npm test -- tests/workflow/structured-content-demo.test.ts`

Expected: PASS.

### Task 7: Add Structured Workflow Smoke Coverage and Documentation

**Files:**
- Modify: `README.md`
- Test: `tests/workflow/structured-content-demo.smoke.test.ts`

- [ ] **Step 1: Write the failing smoke assertion**

Exercise `Task -> Structured Content Demo -> Zod-validated PartialContentAnalysisResult` using DemoProvider fixtures and assert all three outputs exist and contain typed fields.

- [ ] **Step 2: Run the smoke test and verify failure**

Run: `npm test -- tests/workflow/structured-content-demo.smoke.test.ts`

Expected: FAIL until the complete structured flow is wired together.

- [ ] **Step 3: Add minimal local development documentation**

Document the Prompt Registry, StructuredGenerationService responsibilities, the three demo steps, and that no database migration or public API was added in Phase 5.

- [ ] **Step 4: Run the smoke test and verify pass**

Run: `npm test -- tests/workflow/structured-content-demo.smoke.test.ts`

Expected: PASS.

### Task 8: Full Verification, Commit, and Push

**Files:**
- Modify only files from Tasks 1–7.

- [ ] **Step 1: Run all required verification**

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run db:check
npm run build
```

Expected: all commands pass. If the schema is unchanged, explicitly report that no migration was generated or applied.

- [ ] **Step 2: Run the Structured Content Demo Smoke Test**

Run: `npm test -- tests/workflow/structured-content-demo.smoke.test.ts`

Expected: Task input flows through three structured steps, each output passes Zod validation, and final output is a typed partial result.

- [ ] **Step 3: Check repository safety**

Run: `git status --short --branch` and `git diff --check`. Confirm `.env`, API keys, secrets, and temporary files are not staged.

- [ ] **Step 4: Commit the completed Phase 5 implementation**

```bash
git add <verified-phase-5-files>
git commit -m "feat: add structured ai output and prompts"
```

- [ ] **Step 5: Push without rewriting history**

```bash
git push origin main
```

Confirm local `HEAD` equals `git ls-remote --heads origin main` and stop without starting Phase 6.
