# BIOMED AI-first Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy guided-course frontend with one persistent AI-first conversational learning application where GPT-OSS 120B generates pedagogy and rich interactive learning UI.

**Architecture:** Next.js App Router + React + TypeScript replaces the current vanilla application. The browser talks only to Next.js routes; server code validates the BIOMED session, persists conversations/memory in Supabase, calls Groq directly, validates structured rich-turn output, and records analytics.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, AI SDK + @ai-sdk/groq, Zod, Supabase REST/RPC, PostHog, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-30-biomed-ai-first-conversational-tutor-design.md`

## Global Constraints

- Tutor IA is the authenticated application, not an add-on.
- Model is fixed to `openai/gpt-oss-120b`.
- No OpenCode, Railway, Sandbox, Vercel AI Gateway, paid fallback, or second hidden legacy app.
- CPF never enters the model prompt or analytics.
- Rich UI is structured data rendered by allow-listed React components; model HTML/JS is never executed.
- Browser search and Structured Outputs are not combined in one Groq call.
- Only `biomed_*` database objects may be changed.
- Replaced legacy code, tests, and docs must be removed before final merge.

## Review Focus

- Duplicate/retried client messages must not create duplicate turns.
- A student must never read or mutate another student's conversation.
- Invalid/unknown rich blocks must fail closed without corrupting learning memory.
- Groq timeout/429 must preserve the user's message and expose retry.
- Long histories must use persistent summary + recent messages without losing pedagogical memory.

---

### Task 1: Next.js foundation and contracts

**Files:** create Next.js app config, Tailwind, root layout/page, shared types/schema; replace package/CI scripts.

**Interfaces:** produces `RichTutorTurn`, `RichBlock`, curriculum IDs, UI renderer contract.

- [ ] Write schema tests for valid/invalid rich turns.
- [ ] Add pinned Next/React/AI/Groq/Zod/PostHog dependencies.
- [ ] Add App Router/Tailwind foundation.
- [ ] Implement strict Zod rich-turn schema and curriculum.
- [ ] Run tests/build.

### Task 2: Supabase conversational persistence

**Files:** create migration SQL and DB access module.

**Interfaces:** produces conversation/message/memory persistence and server-owned RPCs keyed by BIOMED session token.

- [ ] Add tables, indexes, RLS, privileged functions with explicit grants.
- [ ] Apply SQL with Supabase MCP.
- [ ] Verify ownership, idempotency, archive, history, memory.
- [ ] Run Supabase security/performance advisors.
- [ ] Commit the exact migration in the repository.

### Task 3: Server auth and conversation APIs

**Files:** `app/api/auth`, `profile`, `conversations`, shared session/db modules.

**Interfaces:** browser receives only safe student/conversation data; no Supabase secret or student_id authority.

- [ ] Port existing CPF auth behavior to Next routes.
- [ ] Implement list/create/get/archive conversation routes.
- [ ] Add request validation and no-store responses.
- [ ] Test session and ownership failure paths.

### Task 4: GPT-OSS tutor engine

**Files:** Groq provider, tutor prompt, context builder, web-mode detector, structured generator, chat/retry routes.

**Interfaces:** `POST /api/chat` returns persisted assistant turn with rich blocks and updated pedagogical state.

- [ ] Define versioned tutor instructions.
- [ ] Build context from curriculum + memory + summary + recent history.
- [ ] Implement structured generation for normal turns.
- [ ] Implement browser_search path for current/web requests.
- [ ] Persist success/failure atomically enough to preserve retry semantics.
- [ ] Update memory only from validated structured state.
- [ ] Test model lock, web-mode incompatibility rule, timeout/429/invalid JSON.

### Task 5: Conversational Rich Learning UI

**Files:** chat shell, sidebar, composer, rich-turn renderer, diagram/comparison/steps/table/flashcard/choice/case/sequence/progress/sources components.

**Interfaces:** clicking rich interactions sends a normal chat turn with interaction metadata.

- [ ] Build desktop/mobile shell.
- [ ] Render AI markdown safely.
- [ ] Render semantic SVG diagrams.
- [ ] Render every allow-listed rich block.
- [ ] Implement conversation creation/open/archive and retry.
- [ ] Implement responsive history drawer and learning-progress sidebar.
- [ ] Verify keyboard and touch interactions.

### Task 6: PostHog product + AI observability

**Files:** server/client analytics modules and instrumentation hooks.

- [ ] Capture product events without CPF.
- [ ] Capture LLM provider/model/latency/tokens/errors/traces without exposing secrets.
- [ ] Confirm PostHog receives real events.

### Task 7: Cutover and legacy deletion

**Files:** delete obsolete vanilla frontend, fixed course engines, obsolete APIs/tests/docs/assets; rewrite README/AGENTS as needed.

- [ ] Prove new app has no imports from legacy course/tutor engines.
- [ ] Delete replaced files rather than leaving dead copies.
- [ ] Preserve only genuinely used SVG source assets under `public/biomed/diagrams`.
- [ ] Update tests/docs to the new architecture.
- [ ] Search repository for dead architecture references.

### Task 8: Full verification and production release

- [ ] CI test + typecheck + build all green.
- [ ] Vercel preview READY.
- [ ] Browser flow: login → new conversation → rich content → interaction → reload → history.
- [ ] Real GPT-OSS 120B call and web-search call.
- [ ] Supabase persistence verified.
- [ ] PostHog event ingestion verified.
- [ ] Final security/performance advisors reviewed.
- [ ] Merge to main, production deploy READY, production health/chat smoke test.
- [ ] Close Issue #28 only after all acceptance criteria are evidenced.
