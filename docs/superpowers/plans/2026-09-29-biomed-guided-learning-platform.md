# BIOMED Guided Learning Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild BIOMED as a state-driven learning application with separate screens, persistent progress, formal exams, adaptive practice, and a visual AI tutor that renders controlled educational components instead of plain chat text.

**Architecture:** Keep the existing CPF/session model and scientific content, but replace the authenticated experience with a new application shell and learning engine. Persist lesson/exam/tutor state through dedicated BIOMED RPCs in Supabase, render all student-facing learning blocks from an allow-listed component schema, and use the existing OpenCode/Muse runtime only as a pedagogical orchestrator. The public legacy content remains available as source material/fallback but is no longer the primary authenticated experience.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Vercel Functions, Supabase PostgreSQL/RPC, OpenCode Muse Spark 1.3, PostHog browser analytics contract, Figma for design reference, TinyFish for browser verification, Node 22 built-in test runner.

**Spec:** `docs/superpowers/specs/2026-09-29-biomed-learning-platform-design.md`

## Global Constraints

- The AI never generates arbitrary HTML or edits the site; it returns only allow-listed pedagogical blocks.
- Student Tutor has no GitHub, Vercel, administrative Supabase, or shell access.
- Raw CPF is not persisted.
- Existing concepts Perceber → Conduzir → Processar → Modular → Aplicar remain the course backbone.
- Authenticated students land on a dashboard with one primary “Continuar estudando” action.
- Main study flow must not depend on one long scrolling page.
- Students can answer by clicking options or writing text.
- Exams record score, pass/fail, attempts, best/latest score; pass threshold defaults to 70 and remains configurable.
- Analytics events must not contain CPF.
- Mobile and keyboard interaction remain supported.

## Review Focus

- Returning student with old stats but no new learning-state row must receive a valid migrated dashboard state.
- Tutor response containing unsupported block types must be rejected or normalized to safe fallback content.
- Exam refresh/re-entry must not silently lose a completed score or duplicate an attempt.
- Network failure during progress persistence must preserve a usable local UI and expose retry-safe event keys.
- Small/mobile viewport must keep navigation, primary CTA, answer controls, and progress visible and operable.

---

### Task 1: Persistent learning state and assessment RPCs

**Files:**
- Create: `db/biomed_learning_platform.sql`
- Create: `api/learning-state.js`
- Create: `api/learning-event.js`
- Test: `tests/learning-contract.test.mjs`

**Interfaces:**
- Consumes: existing `biomed_students`, `biomed_sessions`, `biomed_profile`, `biomed_record_event`.
- Produces: `biomed_learning_state`, `biomed_exam_attempts`, RPCs `biomed_learning_profile` and `biomed_learning_action`, plus HTTP APIs `GET /api/learning-state` and `POST /api/learning-event`.

- [ ] Write contract tests asserting module IDs, pass threshold 70, safe state shape, and idempotent event keys.
- [ ] Run tests and verify they fail before implementation.
- [ ] Add migration SQL with RLS-enabled tables, indexes, helper functions, migration-from-existing-stats behavior, and RPCs.
- [ ] Apply migration to the BIOMED Supabase project.
- [ ] Implement the two Vercel API wrappers around the RPCs.
- [ ] Run contract tests and verify pass.
- [ ] Run Supabase security/performance advisors and resolve BIOMED-specific high-value findings.

### Task 2: Authenticated application shell and explicit navigation

**Files:**
- Create: `study-shell.js`
- Create: `study-shell.css`
- Modify: `index.html`
- Modify: `student-app.js`
- Test: `tests/study-shell.test.mjs`

**Interfaces:**
- Consumes: session from `biomed-student-session-v1`, `GET /api/learning-state`.
- Produces: route-driven views `home`, `trail`, `lesson`, `tutor`, `practice`, `exams`, `progress`, `ranking`, `library`.

- [ ] Write structural tests that require the explicit menu, separate route views, one primary resume CTA, and absence of legacy long-page navigation in authenticated shell.
- [ ] Run tests and verify fail.
- [ ] Build responsive application shell, sidebar/mobile navigation, dashboard, progress header, route controller, loading/error states.
- [ ] Make authenticated login mount the new shell while keeping legacy content hidden as a fallback/source.
- [ ] Run tests and verify pass.

### Task 3: Course model and visual lesson renderer

**Files:**
- Create: `data/course-model.js`
- Create: `learning-components.js`
- Create: `learning-components.css`
- Test: `tests/course-model.test.mjs`
- Test: `tests/component-schema.test.mjs`

**Interfaces:**
- Consumes: scientific concepts/assets already present in BIOMED.
- Produces: five modules, lesson progression, and allow-listed render blocks such as `concept`, `neural_path`, `fiber_comparison`, `gate_diagram`, `multiple_choice`, `open_answer`, `case_step`, `simulation`, `feedback`, `checkpoint`.

- [ ] Write tests for five-module order, lesson IDs, next-step resolution, and allow-list validation.
- [ ] Run tests and verify fail.
- [ ] Build normalized course model from existing Perceber/Conduzir/Processar/Modular/Aplicar content.
- [ ] Implement renderer with interactive diagrams, comparison cards, answer controls, feedback, progress checkpoint, and mobile/accessibility states.
- [ ] Wire lesson completion and checkpoint answers to `/api/learning-event`.
- [ ] Run tests and verify pass.

### Task 4: Practice, exams, scores, approval, and recovery flow

**Files:**
- Create: `assessment-engine.js`
- Create: `assessment-ui.js`
- Create: `assessment-ui.css`
- Test: `tests/assessment-engine.test.mjs`

**Interfaces:**
- Consumes: `window.BiomedAdaptive.generateQuestion`, course model, learning-state API.
- Produces: recommended practice, objective/open/simulation/case sessions, 10-question stage exams, cumulative simulations, result/report/recovery views.

- [ ] Write tests for scoring, 70-point pass threshold, best/latest attempt, no answer reveal before exam completion, and recovery recommendation.
- [ ] Run tests and verify fail.
- [ ] Implement practice queue that alternates question types from current weaknesses.
- [ ] Implement exam lifecycle, result screen, score persistence, pass/fail, attempt history, and targeted recovery CTA.
- [ ] Connect dashboard/progress/exam screens to latest and best scores.
- [ ] Run tests and verify pass.

### Task 5: Visual AI tutor orchestration

**Files:**
- Modify: `api/tutor.js`
- Create: `tutor-schema.js`
- Create: `visual-tutor.js`
- Create: `visual-tutor.css`
- Test: `tests/tutor-schema.test.mjs`

**Interfaces:**
- Consumes: authenticated learning profile, Muse Spark/OpenCode runtime, component allow-list.
- Produces: validated JSON screen plans with `screen`, `blocks`, `nextAction`; visual tutor view with clickable and written responses.

- [ ] Write schema tests for accepted blocks, rejected arbitrary HTML/script/unknown block types, and fallback normalization.
- [ ] Run tests and verify fail.
- [ ] Change Tutor system prompt to return only the BIOMED visual lesson JSON contract for visual modes.
- [ ] Validate and normalize server output before returning to browser.
- [ ] Build visual tutor renderer that composes full educational screens from controlled components, while retaining a compact text-help channel.
- [ ] Persist tutor interactions and student responses as learning actions.
- [ ] Run tests and verify pass.

### Task 6: Product analytics and telemetry contract

**Files:**
- Create: `analytics.js`
- Modify: `index.html`
- Test: `tests/analytics.test.mjs`

**Interfaces:**
- Consumes: browser events and authenticated student ID only; never CPF.
- Produces: named events from the spec and a no-op fallback when PostHog is not configured.

- [ ] Write tests that assert event names and prohibit CPF-like properties.
- [ ] Run tests and verify fail.
- [ ] Implement optional PostHog initialization from public runtime config and a safe `trackLearningEvent` wrapper.
- [ ] Instrument dashboard view, resume, lesson, answer, practice, simulation, exam, tutor-render, and stuck events.
- [ ] Run tests and verify pass.
- [ ] Because the connected PostHog workspace is not the BIOMED project, do not mutate that workspace; verify the BIOMED client contract locally and document the required public key/env hookup separately.

### Task 7: Design reference, production deployment, and end-to-end verification

**Files:**
- Modify: `README.md`
- Create: `docs/biomed-learning-platform.md`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: final deployed BIOMED, Figma reference file, browser verification report, production health evidence.

- [ ] Create a Figma design file for the redesigned dashboard, lesson, tutor, and exam-result screens using the BIOMED visual language.
- [ ] Validate JavaScript syntax and run all Node tests.
- [ ] Deploy the implementation through GitHub/Vercel.
- [ ] Verify deployment state and runtime errors.
- [ ] Use a synthetic mathematically valid CPF and test account name `ChatGPT Teste BIOMED` for browser-flow verification; never use real user CPF.
- [ ] Use TinyFish to test login, dashboard, continuation, lesson interaction, Tutor visual flow, practice, and exams without destructive actions.
- [ ] Remove/neutralize synthetic test data if it would pollute ranking.
- [ ] Update documentation with the final architecture and operational notes.
- [ ] Run final whole-branch review against the spec and fix Critical/Important findings before completion.
