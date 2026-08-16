# Teach / Learn + Nested IF/FOR + Ship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students teach P[n], load two lessons, see the PC in the editor, nested IF/FOR work, CALL stays unimplemented, dark pendant chrome, honest docs, CI.

**Architecture:** Pure `lessons` + PC helpers; PositionPanel in the IO `P[]` tab; store `definePosition` / `loadLesson` / live VM snapshots; depth-aware IF matching and FOR register map; no kinematics rewrite.

**Tech Stack:** Expo 50, RN 0.73, Zustand+Immer, Jest 29 (Node), TypeScript.

## Global Constraints

- Extend PR #2 / `cursor/lrmate-ik-web-508a`. Do not rewrite `app/kinematics`.
- Renderer never decides IK success. Unreachable/singular/joint_limit fail MOVE; last pose unchanged.
- `rx,ry,rz` are XYZ Euler RPY, not FANUC WPR.
- CALL throws `CALL is not implemented in this MVP`.
- VM PC is 0-based; UI line numbers are 1-based.
- Lessons set program only; do not wipe seeded/taught positions.
- Origin P[n] persistence must not wipe seeded P[10].
- Web-first. No EAS/App Store. No `expo-gl`.

---

## File map

| File | Role |
|------|------|
| `app/lessons.ts` | Lesson catalog |
| `app/editor/programCounter.ts` | Highlight + display line |
| `app/theme.ts` | Dark pendant colors |
| `app/components/LessonPicker.tsx` | Lesson chips |
| `app/components/PositionPanel.tsx` | Teach P[1]–P[10] |
| `app/components/CodeEditor.tsx` | Gutter highlight |
| `app/components/IOPanel.tsx` | `P[]` tab |
| `app/store/index.ts` | loadLesson, teachCurrent, live snapshot |
| `app/store/persistence.ts` | Save on position changes |
| `app/utils/interpreter.ts` | Nested IF/FOR, getExecutionLog |
| `app/App.tsx` | Wire picker, PC, theme |
| `tests/lessons.test.ts` | Catalog |
| `tests/programCounter.test.ts` | Highlight helper |
| `tests/interpreter.test.ts` | Nested IF/FOR |
| `tests/store.test.ts` | Teach, lessons, persist |
| `.github/workflows/ci.yml` | test + tsc |
| `README.md` + leftover phase docs | Honest status |

---

### Task 1: Nested IF/FOR (TDD)

**Files:**
- Modify: `tests/interpreter.test.ts`
- Modify: `app/utils/interpreter.ts`

**Interfaces:**
- Consumes: existing `FANUCInterpreter.execute`
- Produces: depth-aware `findMatchingElseOrEndif`; FOR `J→PR[1]`, `I→PR[2]`, `K→PR[3]`, `PR[n]`

- [ ] **Step 1: Write failing nested IF/FOR tests**
- [ ] **Step 2: Run tests; confirm nested IF false-outer fails (wrong PR)**
- [ ] **Step 3: Depth-aware matching + FOR register map**
- [ ] **Step 4: Tests pass; CALL still unimplemented**
- [ ] **Step 5: Commit**

---

### Task 2: Lessons + PC helpers + store teach (TDD)

**Files:**
- Create: `app/lessons.ts`, `app/editor/programCounter.ts`
- Modify: `app/store/index.ts`, `app/store/types.ts`, `app/store/persistence.ts`
- Test: `tests/lessons.test.ts`, `tests/programCounter.test.ts`, `tests/store.test.ts`

- [ ] **Step 1: Failing tests for catalog, highlight, loadLesson, teach, persist**
- [ ] **Step 2: Implement helpers + store actions + persist subscribe**
- [ ] **Step 3: `getExecutionLog` + live snapshot during run**
- [ ] **Step 4: Tests pass; commit**

---

### Task 3: Teach/learn UI

**Files:**
- Create: `app/theme.ts`, `app/components/LessonPicker.tsx`, `app/components/PositionPanel.tsx`
- Modify: `CodeEditor.tsx`, `IOPanel.tsx`, `App.tsx`, `ExecutionConsole.tsx`, `ExecutionControls.tsx`

- [ ] **Step 1: Dark tokens + a11y labels**
- [ ] **Step 2: LessonPicker + PositionPanel in P[] tab**
- [ ] **Step 3: CodeEditor gutter highlight; console 1-based line**
- [ ] **Step 4: Commit**

---

### Task 4: Ship cleanup

**Files:**
- Create: `.github/workflows/ci.yml`
- Modify: `package.json` (drop unused deps), `README.md`, `PHASES_2_4_COMPLETE.md`, `ACCELERATED_BUILD_SUMMARY.md`, `BUILD_STATUS.md`

- [ ] **Step 1: Remove PRODUCTION READY claims; document teach + nested IF**
- [ ] **Step 2: Uninstall `jest-expo`, `@react-three/postprocessing`**
- [ ] **Step 3: CI workflow `npm ci && npm test && npx tsc --noEmit`**
- [ ] **Step 4: Full verify; push; update PR #2**
