# FANUC iOS Teach Pendant MVP — Repair Design

**Date:** 2026-08-15  
**Status:** Approved for planning (analysis-driven; assumptions locked below)  
**Repo:** `github.com/axelruiz21/Fanuc-IOS-APP-`  
**Audience:** Implementers repairing the existing Expo / React Native educational simulator

---

## 1. Problem statement

The repository claims Phases 1–4 are complete and production-ready. That is not true.

The app is an educational FANUC teach-pendant simulator. Students should write a small TP program, press Play, watch I/O and position update, and step/pause/resume. Today that path is broken at every layer:

| Layer | Claimed | Actual |
|-------|---------|--------|
| Interpreter | All MVP commands work | `MOVE P[1]`, `DOUT OT[1]=ON`, `WAIT`, `IF/ELSE`, `FOR`, `CALL` fail or are stubs |
| Store | Zustand wraps the VM | Breakpoints crash Immer; resume restarts; pause is a UI flag only |
| UI | Play / Pause / Resume / 3D | Resume calls `runProgram`; 3D never mounts; Expo cannot boot |
| Tests | 12 integration tests pass | `console.assert` never fails the runner; Jest cannot parse TypeScript |
| Docs | “Production-ready” | QA checklist in `TEAM_FEEDBACK.md` is still empty |

The repair is not a rewrite of the product. It is making the existing public API do what the docs already promise.

---

## 2. Locked assumptions

These decisions are locked so implementation does not stall on product questions.

1. **Keep the public interpreter API.** `FANUCInterpreter`, `execute`, `step`, `continue`, `pause`, `reset`, `definePosition`, `setDigitalInput`, `setRegister`, `getState`, `ExecutionResult.state` stay. Do not switch to the unused prompt shape (`result.currentPosition`, `result.ioState`).
2. **Keep Zustand + Immer.** Do not migrate to Redux or Context.
3. **WAIT actually waits.** Students must see timing. `WAIT 1.0` blocks ~1 second via `await`, not a timestamp-and-break that reports success immediately.
4. **CALL stays unimplemented.** It must throw a clear error (`CALL is not implemented in this MVP`). Do not pretend it works.
5. **Editor line numbers are source of truth.** The VM must execute against the original source lines (1-based in the UI, 0-based index in the VM). Do not strip comments/blanks into a separate index space.
6. **Primary target is iPad landscape via Expo.** Web is secondary. Native Three.js / `expo-gl` is out of this repair’s scope.
7. **Viewport stays 2D (`Viewport3D`).** `RobotArm.tsx` / `RobotArm.web.tsx` are not wired until the interpreter and boot path work. Do not add `expo-gl` in this plan.
8. **Jest is the test runner.** Replace `console.assert` helpers with real `describe` / `it` / `expect` tests.
9. **Honesty over marketing.** After repair, docs must match behavior. No “production-ready” claims for unfinished work.

---

## 3. Approaches considered

### Approach A — Surgical repair of the existing class (recommended)

Keep `FANUCInterpreter` and the Zustand store. Fix the tokenizer, extract a resumable run loop, implement IF/FOR/WAIT correctly, then fix store/UI/boot/tests.

- **Pros:** Smallest change to a public API the UI already calls; each fix is independently testable; students get a working pendant fastest.
- **Cons:** The class stays a 900-line file; no real AST.

### Approach B — Rewrite the interpreter as an AST VM

Tokenize → parse structured nodes → execute a tree with a loop stack and jump table.

- **Pros:** Cleaner control flow; easier to add CALL later.
- **Cons:** Touches every command; delays a working Play button; higher regression risk with no current test harness.

### Approach C — Compatibility wrapper

Leave the broken VM, add a second parser in front of it.

- **Pros:** Avoids editing “frozen” Phase 1 code.
- **Cons:** Two parsers; `continue` / `pause` / `getState` still broken inside the VM; more debt.

**Recommendation: Approach A.** The API shape is fine. The defects are localized (identifier charset, run-loop reset, missing loop stack, Immer `Set`, Expo entry path). A rewrite is not justified until CALL, nested IF, and real kinematics are in scope.

---

## 4. Architecture after repair

```
App.tsx (root re-export → app/App.tsx)
  └─ useAppStore (Zustand + Immer)
       ├─ program / history
       ├─ interpreter: FANUCInterpreter   (single instance)
       ├─ interpreterState                (clone from getState())
       ├─ isRunning / isPaused            (synced from VM)
       └─ persistence (AsyncStorage, localStorage fallback)
            │
            ▼
       FANUCInterpreter
         tokenize(line)  → discrete P / [ / n / ]
         execute(program) → load source lines, PC=0, runLoop()
         continue()       → isPaused=false, runLoop() from current PC
         step()           → execute one source line, keep context
         pause()          → isPaused=true (checked every iteration + WAIT)
```

### 4.1 Interpreter units

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `tokenize` | Split a line into `P`, `[`, `1`, `]`, numbers, operators | Nothing |
| `parsePositionRef` / `parseIORef` / `parseRegisterRef` | Consume discrete tokens; return `{ index, nextIdx }` | `tokenize` |
| `runLoop` | Shared by `execute` and `continue`; honors pause, breakpoint, END | command handlers |
| `executeWAIT` | `await` sleep or poll DI | injectable `now` / `sleep` (optional; `Date.now` + `setTimeout` is enough for MVP) |
| `executeIF` | Skip THEN or ELSE body without double-incrementing PC | `evaluateCondition` |
| `executeFOR` / `ENDFOR` | Loop stack on `ExecutionContext` | registers |
| `getState` | Deep clone that preserves `Set<number>` for breakpoints | state |

### 4.2 Store units

| Unit | Responsibility |
|------|----------------|
| `useAppStore` | One interpreter instance; actions call VM then snapshot |
| `breakpointLines` | `number[]` (not `Set`) so Immer does not need `enableMapSet` |
| `runProgram` / `resumeExecution` | Distinct; UI Play vs Resume map to them |
| `syncFromResult(result)` | Shared helper: logs, `interpreterState`, `isPaused`, `isRunning`, `lastError` |
| persistence | `@react-native-async-storage/async-storage` with `localStorage` fallback; vanilla `subscribe` |

### 4.3 UI units

| Unit | Change |
|------|--------|
| Root `App.tsx` | Re-export `app/App.tsx` so Expo `AppEntry` resolves |
| `ExecutionControls` | Add `onResume`; Play calls `onPlay`, Resume calls `onResume` |
| `app/App.tsx` | Wire those callbacks; live orientation via `Dimensions` listener; portrait includes `Viewport3D` |
| `CodeEditor` | Valid RN `TextInput` props only; real newlines in placeholder |
| `Viewport3D` | Project relative to measured container, not `windowWidth/2 - 70` |
| `components/index.ts` | Stop exporting non-existent `RobotArmModel` |

---

## 5. Interpreter behavior (normative)

### 5.1 Tokenization

Identifiers are `[A-Za-z_][A-Za-z0-9_]*` only. `[` and `]` are punctuation.

`MOVE P[1]` tokens:

```
COMMAND(MOVE), IDENTIFIER(P), PUNCTUATION([), NUMBER(1), PUNCTUATION(])
```

`DOUT OT[1]=ON` tokens:

```
COMMAND(DOUT), IDENTIFIER(OT), PUNCTUATION([), NUMBER(1), PUNCTUATION(]), OPERATOR(=), COMMAND(ON)
```

`J P[1] 100%` tokens after `parsePositionRef(tokens, 1)`:

```
nextIdx points at NUMBER(100); speed is that token, not tokens[3]
```

### 5.2 Source lines and program counter

`preprocessProgram` may drop `/PROG`, `/BODY`, `/ATTR`, `/COMMENT`, `/ACCESS`, `/REL`, `/PTP` metadata lines. It must **keep** blank lines and `;` comments so `programCounter` matches the editor:

- Editor line 1 → `programCounter === 0`
- Breakpoints stored as 0-based source indices
- UI displays `programCounter + 1`

### 5.3 Run loop

```
execute(program):
  lines = preprocess(program)
  context = { lines, log: [], stopExecution: false, loopStack: [] }
  programCounter = 0
  isPaused = false
  return runLoop()

continue():
  if no context → error
  isPaused = false
  return runLoop()   // do not reset PC or log

runLoop():
  while PC < lines.length and not stopExecution:
    if isPaused: break
    if breakpoint at PC and not already stopping on it this visit:
      isPaused = true
      log breakpoint
      break
    executeLine(lines[PC], PC)
    if command was END: stopExecution = true
    else if command did not jump: PC++
  isRunning = false
  success = true unless an exception was thrown
```

`executeLine` for `IF` / `FOR` / `ENDFOR` may set PC itself. Those handlers must leave PC on the last consumed structural line so the loop’s trailing `PC++` lands on the next real statement — **or** they set a `didJump` flag and the loop does not increment. Pick one rule and use it everywhere. **Chosen rule:** handlers that skip or jump set `context.didJump = true` and set `programCounter` to the **next line to execute**. The run loop increments only when `didJump` is false.

### 5.4 WAIT

`WAIT 1.0`:

```
log the wait
await sleep(1000)
if isPaused during sleep, stop sleeping and leave PC on the WAIT line
```

`WAIT DIN(DI[n])`:

```
while DI[n] is false and not isPaused and not stopExecution:
  await sleep(100)
```

Do not return `success: true` while a wait is still outstanding. The current timestamp-and-`break` path is deleted.

### 5.5 IF / ELSE / ENDIF

Supported forms (multiline):

```
IF (PR[1]>50)
  DOUT OT[1]=ON
ELSE
  DOUT OT[1]=OFF
ENDIF
```

```
IF (DI[1]=ON)
  MOVE P[1]
ENDIF
```

Rules:

- `THEN` on the IF line or on its own line is ignored (no-op).
- True: execute THEN body; when `ELSE` is reached, jump to the line after matching `ENDIF` (`didJump`).
- False: jump to the line after `ELSE`, or after `ENDIF` if no ELSE (`didJump`).
- `ELSE` and `ENDIF` as standalone commands never throw `Unknown command`.
- Nested IF is out of scope. Matching uses the next `ELSE`/`ENDIF` at the same depth of 1.

### 5.6 FOR / ENDFOR

```
FOR J=1 TO 3
  MOVE P[J]
ENDFOR
```

`ExecutionContext.loopStack` entries:

```
{ headerLine: number, bodyStart: number, variable: 'J', current: number, end: number, registerIndex: number }
```

- `J` maps to `PR[1]` (documented FANUC-lite convention for this MVP).
- `FOR I=1 TO n` without digits also uses `PR[1]`. `FOR PR[2]=1 TO n` uses register 2 if that form appears; MVP tests only require `J`.
- On `FOR`: push frame, set register to `start`, `didJump` false (fall into body).
- On `ENDFOR`: increment `current` and register; if `current <= end`, set PC to `bodyStart` and `didJump`; else pop and fall through.
- `MOVE P[J]` and `MOVE P[PR[n]]` must resolve the index from the register, not only from a numeric literal.

### 5.7 Expressions

`evaluateExpression` must handle, in order:

1. Number literal (including negative: `-10`)
2. `PR[a] + PR[b]` / `-` / `*` / `/`
3. `PR[a] + 10` (and other ops)
4. Bare `PR[a]`

Division by zero throws `Division by zero`.

### 5.8 Motion and I/O bounds

After a successful parse:

- `P[n]`, `PR[n]` require `1..100` or throw
- `DI[n]`, `DO[n]`, `OT[n]` require `1..32` or throw
- `MOVE` to an undefined-but-in-range position uses the initialized zero pose (positions are pre-allocated). The store seeds `P[1]` and `P[2]` with demo coordinates so the default program moves.

### 5.9 `getState()`

Must return a deep clone. `breakPoints` remains a `Set<number>` (`new Set(this.state.breakPoints)`). Do not `JSON.parse(JSON.stringify(this.state))`.

### 5.10 `pause()`

Sets `isPaused = true`. `runLoop` and WAIT polling check it. Fast programs that finish before the user taps Pause may already be done; that is acceptable.

---

## 6. Store and persistence behavior

### 6.1 Single interpreter

```
interpreter: new FANUCInterpreter()
interpreterState: interpreter.getState()   // same instance, cloned snapshot
```

`reset()` creates **one** new interpreter and snapshots it.

### 6.2 Breakpoints

`breakpointLines: number[]`. Add/remove via array methods. Mirror into `interpreter.addBreakPoint` / `removeBreakPoint` **outside** the Immer draft (side effects after `set`, or before `set` on the live instance).

### 6.3 Sync helper

Every execution action ends with:

```
isRunning = false
isPaused = result.state.isPaused
interpreterState = result.state
executionLogs = result.executionLog
lastError = result.success ? null : (result.error ?? 'Unknown error')
```

Breakpoint hits therefore show Resume in the UI.

### 6.4 History

When `programHistory.length === MAX_HISTORY`, drop the oldest entry and continue recording. Do not freeze history.

### 6.5 Persistence

- Dependency: `@react-native-async-storage/async-storage`
- `saveState` / `loadState` use AsyncStorage; if import or call fails (web/tests), fall back to `localStorage` when `typeof localStorage !== 'undefined'`
- Auto-save: `useAppStore.subscribe((state, prev) => { if (state.program !== prev.program) debounce(saveState) })` — vanilla one-argument subscribe
- Restore must not crash; breakpoints are numbers

---

## 7. App boot and UI behavior

### 7.1 Expo entry

`package.json` `"main": "node_modules/expo/AppEntry.js"` imports `../../App`. Create `/App.tsx`:

```
export { default } from './app/App';
```

Add `babel.config.js` with `babel-preset-expo`. Add placeholder PNGs under `assets/` referenced by `app.json` (1×1 or simple generated icons are enough to boot).

### 7.2 Play / Resume

`ExecutionControlsProps` gains `onResume?: () => void`.

- Not paused → Play → `onPlay` → `runProgram`
- Paused → Resume → `onResume` ?? `onPlay` → `resumeExecution`

`app/App.tsx` passes both. Duplicate landscape/portrait handlers stay until a later extract; both must be wired the same way.

### 7.3 Orientation

Do not compute `isLandscape` at module load. Use `useWindowDimensions()` (or a `Dimensions` listener) so rotation updates layout. Portrait layout includes `Viewport3D`.

### 7.4 Editor

Remove invalid `fontFamily` / `fontSize` props on `TextInput` (they already live in `styles.input`). Placeholder uses real `\n`, not `&#10;`. Unused `Dimensions`, `cursorPosition`, and `handleSave` are removed so `noUnusedLocals` passes.

### 7.5 Viewport

Measure the viewport container with `onLayout`. Origin is the measured center. End-effector is `center + (x/maxCoord)*radius`. Delete the `windowWidth / 2 - 70` offset and CSS `transformOrigin` link line if it cannot be positioned from the same numbers. Show coordinates; do not show “Phase 4 will replace this” to students. `isLoading` is not bound to `isRunning`.

### 7.6 Barrel export

`app/components/index.ts` exports only symbols that exist. Drop `RobotArmModel`. `RobotArm.web.tsx` must not import `Canvas` from `react-native` and must not render lowercase `<view>`.

### 7.7 Default demo

On store init, after constructing the interpreter:

```
definePosition(1, { x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0 })
definePosition(2, { x: 150, y: 250, z: 350, rx: 45, ry: 0, rz: 0 })
```

The default program in `INITIAL_PROGRAM` then produces visible motion.

---

## 8. Testing

### 8.1 Harness

- `jest.config.js` using `jest-expo` (or `ts-jest` + `jest-environment-node` for interpreter-only files)
- `babel.config.js` with `babel-preset-expo`
- Interpreter tests run in Node (no RN renderer)
- Store tests mock AsyncStorage

### 8.2 Required interpreter cases

| Test | Expect |
|------|--------|
| `MOVE P[1]` after `definePosition` | `success`, `currentPosition.x === 100` |
| `DOUT OT[1]=ON` | `io.DO[1] === true` |
| `WAIT 0.05` then `DOUT` | elapsed ≥ 50ms, DO set after wait |
| `IF (PR[1]>50)` true with ELSE | THEN body runs; ELSE skipped; no `Unknown command: ELSE` |
| `IF` false with ELSE | ELSE body runs |
| `FOR J=1 TO 3` increment PR[2] | PR[2] === 3 |
| `PR[3]=PR[1]+PR[2]` | 50+30=80 |
| `continue` after breakpoint | does not restart from line 0 |
| `pause` during WAIT | `isPaused`, later lines not run |
| `P[0]` / `OT[33]` | `success === false` |
| `CALL LESSON2` | `success === false`, message mentions not implemented |
| `getState().breakPoints.has(n)` | true after `addBreakPoint` |

### 8.3 Required store cases

| Test | Expect |
|------|--------|
| `addBreakpoint(3)` | no throw; `breakpointLines` includes 3 |
| `runProgram` on default program | success after interpreter fix + seeded positions |
| `resumeExecution` after pause | calls `continue`, does not clear log from the start |

### 8.4 Delete false confidence

Rewrite `tests/integration.test.ts` as Jest tests. Remove `console.assert` and `|| true`.

---

## 9. Tooling

`package.json` changes:

- Add `babel-preset-expo`, `jest-expo`, `@react-native-async-storage/async-storage`
- Pin `@testing-library/react-native` to a React 18-compatible release, or add `.npmrc` `legacy-peer-deps=true`
- Keep React 18.2 / RN 0.73 / Expo 50
- `npm test` must run Jest on `tests/**/*.test.ts`

`tsconfig.json` already extends `expo/tsconfig.base` and uses strict + `noUnusedLocals`. Repair must make `npm run type-check` pass.

Out of scope for this repair: `react-native-web` / Expo web export, `expo-gl`, syntax highlighting, autocomplete, accessibility audit, real inverse kinematics.

---

## 10. Documentation

Update, do not multiply, the source of truth:

- `README.md` — Phase 1 is “repaired, not frozen”; CALL unimplemented; 3D is a 2D viewport
- `PHASE1_COMPLETE.md` — remove “PRODUCTION READY” and the CALL ✅ row
- `DELIVERABLES.md` / `START_HERE.md` / `ACCELERATED_BUILD_SUMMARY.md` — add a short banner pointing at this spec; do not rewrite every marketing file in the first pass

---

## 11. Error handling

- Parse/runtime errors become `ExecutionResult.success = false` with `Line {n}: ...` (n is 0-based PC; UI adds 1)
- Store actions catch and set `lastError`
- Persistence failures log and continue; they never crash the app
- Persistence restore of bad JSON returns `null`

---

## 12. Success criteria

The repair is done when all of the following are true:

1. `npm test` runs Jest and the new interpreter + store tests pass
2. `npm run type-check` exits 0
3. Expo can resolve `App` from the project root
4. Default program (`MOVE P[1]` → `DOUT` → `WAIT` → `MOVE P[2]` → `DOUT OFF`) executes successfully
5. Play / Pause / Resume / Step match the semantics in §5.3 and §7.2
6. Breakpoints do not throw
7. Docs no longer claim CALL or native Three.js are complete

---

## 13. Out of scope (explicit)

- Nested IF / nested FOR
- CALL / program library
- Real FANUC kinematics, collision, speed interpolation
- Wiring `RobotArmViewer` into `App.tsx`
- Syntax highlighting, autocomplete, lesson curriculum
- Expo web (`react-native-web`)
- App Store / TestFlight packaging

---

## 14. Spec self-review

- No TBD/TODO placeholders remain.
- Approach A is the only implementation path.
- Scope is one repair plan: interpreter correctness → store → boot/UI → tests/docs.
- Ambiguities resolved: line numbering (source lines), WAIT (real await), CALL (throws), 3D (Viewport3D only), breakpoints (`number[]` in store).
