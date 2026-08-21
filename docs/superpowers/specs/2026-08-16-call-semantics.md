# CALL Subprogram Semantics

**Date:** 2026-08-16  
**Status:** Locked for Slice 2 (interpreter hardening)  
**Repo:** `github.com/axelruiz21/Fanuc-IOS-APP-`  
**Audience:** Implementers adding `CALL` to `FANUCInterpreter`

---

## 1. Decision

Implement **real CALL**. Do not leave a silent no-op. An unregistered name is an error, not success.

Nested `IF`/`FOR` stay as they are (depth-aware IF matching; `J`/`I`/`K`/`PR[n]` loop registers). Extra tests lock ELSE-branch nesting and same-variable nested `FOR`.

---

## 2. Program library

```typescript
registerProgram(name: string, source: string): void
```

- Names are case-insensitive (`LESSON2` = `lesson2`). Stored uppercase.
- Source is the same TP text `execute` accepts (comments kept; `/PROG` headers stripped).
- Library lives on the interpreter instance, **not** in `InterpreterState`. `reset()` clears positions/PC but **keeps** registered programs. A new `FANUCInterpreter` starts empty.
- Empty name → throw `Program name required` at register time.

The store seeds lesson ids (`REACHABLE`, `UNREACHABLE`) so students can `CALL REACHABLE` from the editor.

---

## 3. Stack

Public `InterpreterState.callStack` is:

```typescript
interface CallFrame {
  programName: string;
  returnPC: number; // 0-based line in the caller to resume at
}
```

Internal frames also hold the caller’s `lines` and `loopStack` so the callee cannot steal the caller’s FOR frames.

- `execute()` starts with `callStack = []` and the main program as `context.lines`.
- Max depth **8** (frames on the stack, i.e. 8 nested CALLs). The 9th CALL fails.

---

## 4. PC restore

`CALL NAME` at caller line `L`:

1. Resolve `NAME`. Unknown → error (below).
2. If `callStack.length >= 8` → `CALL: stack overflow`.
3. Push `{ programName: NAME, returnPC: L + 1, lines: callerLines, loopStack: copy }`.
4. Set `context.lines` to the callee’s preprocessed lines, `context.loopStack = []`, `programCounter = 0`, `didJump = true`.
5. Log `[L] CALL NAME`.

Callee `END`:

- If the stack is non-empty: pop; restore caller `lines` and `loopStack`; set `programCounter = returnPC`; `didJump = true`; log return. Do **not** stop the main program.
- If the stack is empty: current behavior (`stopExecution = true`).

Falling off the last callee line without `END` is the same as `END` (return or stop).

---

## 5. Error policy

| Case | `success` | `error` | Caller resumes? | `isRunning` |
|------|-----------|---------|-----------------|-------------|
| Missing name (`CALL`) | false | `CALL: expected program name` | no | false |
| Unknown name | false | `CALL: unknown program NAME` | no | false |
| Depth > 8 | false | `CALL: stack overflow` | no | false |
| Callee MOVE/IF/… throws | false | `Line {calleePC}: …` (existing wrap) | no | false |

On any CALL/callee failure:

- Do **not** apply later caller statements.
- Leave `callStack` as it was at the failure (callee frame still present if the error is inside the callee) so the snapshot shows where it died.
- Never treat CALL as success when the callee did not run.

No “CALL is not implemented” once this ships. Tests that expected that string must expect the table above.

---

## 6. Shared VM state

Callee and caller share positions, registers, I/O, `currentPosition`, `currentJoints`. That is the educational model: one robot, several programs.

Breakpoints are 0-based indexes into **whatever program is current**. Out of scope to namespace them per program.

---

## 7. Out of scope

Arguments to CALL, local registers, `RETURN` as a separate keyword (END returns), UI for editing multiple files, FANUC `CALL program(arg)`.
