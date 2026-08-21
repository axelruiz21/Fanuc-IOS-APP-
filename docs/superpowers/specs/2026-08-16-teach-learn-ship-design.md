# Teach / Learn, Nested IF/FOR, Ship Cleanup

**Date:** 2026-08-16  
**Status:** Approved by the production-grade queue (Slice 1 → 2 → 3)  
**Repo:** `github.com/axelruiz21/Fanuc-IOS-APP-`  
**Branch:** extend `cursor/lrmate-ik-web-508a` / PR #2  
**Audience:** Implementers adding the student teach loop, nested control flow, and honest ship path

---

## 1. Problem

Slice 0 proved Play + IK + web 3D. Students still cannot **teach** a point, **see which line** the VM is on, or **load a lesson** that shows a legal MOVE versus an unreachable one. Nested `IF`/`FOR` still bind to the first `ELSE`/`ENDIF`. Stale docs claim production-ready. Unused deps and no CI.

Done looks like: edit a program, teach P[n], Play, watch the 6-link arm jump, see MOVE fail clearly when illegal, step with the current line highlighted. Nested IF/FOR work. CALL still throws unimplemented.

---

## 2. Locked decisions

1. **Extend PR #2.** Do not rewrite kinematics. Renderer never decides IK success.
2. **Teach via `definePosition`.** Typed XYZ+RPY and “Teach current pose”. No fake MOVE path, no clamp.
3. **Editor highlight uses VM PC** (0-based). UI line numbers stay 1-based. Highlight only while running, paused, or on error.
4. **Two lessons:** reachable default program; unreachable `MOVE P[10]` (seeded 2000 mm). Lessons set the program only; they do not wipe taught/seeded positions.
5. **Nested IF/FOR** with depth-aware matching. `FOR J` → `PR[1]` (P[J]). `FOR I` → `PR[2]`. `FOR K` → `PR[3]`. `FOR PR[n]` → that register. Unknown FOR names error.
6. **CALL is specified** in `docs/superpowers/specs/2026-08-16-call-semantics.md` (stack, PC restore, explicit errors). Unknown names do not succeed.
7. **Web-first.** Dark pendant chrome on existing RN views. No EAS / App Store.
8. **Honesty:** kill “PRODUCTION READY” in leftover phase docs. Drop unused `jest-expo` and `@react-three/postprocessing`. GitHub Actions: `npm test` + `tsc --noEmit`.

---

## 3. Approaches (Slice 1 layout)

**A — Positions as a DATA tab in IOPanel (recommended).** Lesson chips above the editor. Reuses the right column; matches pendant DATA.

**B — Dedicated PositionPanel column.** Clearer on desktop; squeezes iPad landscape.

**C — Modal teach wizard.** Extra navigation; hides the arm.

**Recommendation: A.** LessonPicker above CodeEditor; PositionPanel composed as the IOPanel `P[]` tab.

Live PC during Play: poll interpreter snapshots (~50 ms) in `runProgram` / `resumeExecution` so WAIT does not freeze the gutter. Logs via `getExecutionLog()`.

---

## 4. Architecture

```
LessonPicker → store.loadLesson(id) → setProgram only
PositionPanel → definePosition | teachCurrentPosition → VM positions
CodeEditor currentLine ← interpreterState.programCounter (when active)
Play/Step → VM → IK (unchanged) → currentJoints → RobotArmViewer
```

| Unit | Responsibility |
|------|----------------|
| `app/lessons.ts` | Lesson catalog (pure) |
| `app/editor/programCounter.ts` | Highlight index + 1-based display line |
| `app/components/LessonPicker.tsx` | Load lesson chips |
| `app/components/PositionPanel.tsx` | P[1]–P[10] edit / teach |
| `app/components/IOPanel.tsx` | Host `P[]` tab |
| `app/components/CodeEditor.tsx` | Gutter highlight from PC |
| `app/store` | `loadLesson`, `teachCurrentPosition`, live snapshot, persist positions |
| `app/utils/interpreter.ts` | Nested IF/FOR; `getExecutionLog()` |
| `app/theme.ts` | Dark pendant tokens |

Kinematics and RobotArm stay untouched except theme wrappers if needed.

---

## 5. Nested IF/FOR

`findMatchingElseOrEndif` tracks IF depth. Inner ELSE/ENDIF do not close the outer IF. Outer false IF jumps to its own ELSE or past its ENDIF.

FOR uses `loopStack` (already). Distinct registers so nested I/J do not clobber `P[J]`. Missing ENDIF still throws `Missing ENDIF`. CALL unchanged.

---

## 6. Persistence

Auto-save when `program`, `breakpointLines`, **or** `interpreterState.positions` change. Origin `{0,0,0,0,0,0}` still must not overwrite seeded P[10] on restore (`isUnsetPosition`).

---

## 7. Testing

Jest Node, no RN render suite required.

- Lessons: ids, programs, `getLesson`
- Store: loadLesson keeps P[10]; teach then MOVE; persist taught non-origin P[n]
- PC helper: inactive → no highlight; error/pause → PC index
- Interpreter: nested IF (false outer); nested IF both true; IF in FOR; nested FOR I/J; CALL still unimplemented
- Existing 47 tests stay green

---

## 8. Out of scope

Native 3D, FANUC WPR, CALL implementation, Cartesian blending, EAS, collision, P[11]–P[100] editor rows.
