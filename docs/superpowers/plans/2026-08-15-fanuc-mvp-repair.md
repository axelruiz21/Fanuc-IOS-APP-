# FANUC iOS Teach Pendant MVP Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing FANUC teach-pendant simulator actually run its default program, pause/resume/step correctly, boot under Expo, and report real test results.

**Architecture:** Keep `FANUCInterpreter` and the Zustand store. Fix tokenization so `P[1]` is four tokens, extract a resumable `runLoop()`, implement IF/FOR/WAIT against source line numbers, replace store `Set` breakpoints with `number[]`, and add a root Expo entry. Native Three.js stays unwired.

**Tech Stack:** TypeScript 5, Expo 50, React Native 0.73, React 18.2, Zustand 4 + Immer 10, Jest + babel-preset-expo

## Global Constraints

- Keep the public API: `FANUCInterpreter.execute/step/continue/pause/reset/definePosition/setDigitalInput/setRegister/getState` and `ExecutionResult.state`.
- Keep Zustand + Immer. Do not migrate to Redux.
- `WAIT n.n` must `await` a real delay. Do not use timestamp-and-break.
- `CALL` throws `CALL is not implemented in this MVP`. Do not fake success.
- Program counter is 0-based **source** line index (editor line = PC + 1). Keep comments and blanks.
- `breakpointLines` in the store is `number[]`, not `Set`.
- Primary target is iPad landscape via Expo. Do not add `expo-gl` or wire `RobotArmViewer`.
- Jest with `describe`/`it`/`expect` only. No `console.assert`.
- `npm run type-check` must pass (`strict`, `noUnusedLocals`).
- Do not claim CALL or native 3D are complete in docs.

---

## File map

| File | Role after this plan |
|------|----------------------|
| `app/utils/interpreter.ts` | Working VM: tokenize, runLoop, IF/FOR/WAIT, clone `getState` |
| `tests/interpreter.test.ts` | Jest unit tests for the VM (create) |
| `tests/store.test.ts` | Jest tests for Zustand actions (create) |
| `tests/integration.test.ts` | Rewrite as real Jest e2e of the default program |
| `jest.config.js` | Node + babel-jest for `tests/**/*.test.ts` (create) |
| `babel.config.js` | `babel-preset-expo` (create) |
| `package.json` | Add jest-expo tooling, AsyncStorage, pin RN testing lib |
| `app/store/types.ts` | `breakpointLines: number[]` |
| `app/store/index.ts` | Single VM instance, sync helper, history eviction, seeded P[1]/P[2] |
| `app/store/persistence.ts` | AsyncStorage + localStorage fallback; vanilla subscribe |
| `app/store/hooks.ts` | Remove unused `useCallback` import |
| `App.tsx` | Root re-export for Expo `AppEntry` (create) |
| `app/App.tsx` | Wire Resume, live orientation, portrait viewport |
| `app/components/ExecutionControls.tsx` | `onResume` prop |
| `app/components/CodeEditor.tsx` | Valid TextInput props; real newline placeholder |
| `app/components/Viewport3D.tsx` | Layout-based projection; no Phase-4 student note |
| `app/components/index.ts` | Drop `RobotArmModel` export |
| `app/components/RobotArm.web.tsx` | Valid RN fallback (no `Canvas` import, no `<view>`) |
| `assets/*.png` | Placeholder icons so `app.json` resolves |
| `README.md`, `PHASE1_COMPLETE.md` | Honest status |

---

### Task 1: Jest harness that can fail

**Files:**
- Create: `babel.config.js`
- Create: `jest.config.js`
- Modify: `package.json`
- Create: `tests/interpreter.test.ts` (one failing smoke test only)

**Interfaces:**
- Consumes: none
- Produces: `npm test` runs TypeScript tests via babel-jest

- [ ] **Step 1: Add Babel + Jest config**

```javascript
// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
```

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', { presets: ['babel-preset-expo'] }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1',
  },
};
```

- [ ] **Step 2: Update package.json scripts and deps**

Add to `devDependencies` (keep existing versions for react/expo):

```json
"babel-preset-expo": "^10.0.0",
"jest-expo": "^50.0.0"
```

Add to `dependencies`:

```json
"@react-native-async-storage/async-storage": "^1.21.0"
```

Change `@testing-library/react-native` to `^12.4.3` (React 18 peer). Add `.npmrc`:

```
legacy-peer-deps=true
```

- [ ] **Step 3: Write one failing smoke test**

```typescript
// tests/interpreter.test.ts
import { FANUCInterpreter } from '../app/utils/interpreter';

describe('FANUCInterpreter smoke', () => {
  it('executes MOVE P[1] to a taught position', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0 });
    const result = await vm.execute('MOVE P[1]\nEND');
    expect(result.success).toBe(true);
    expect(result.state.currentPosition?.x).toBe(100);
  });
});
```

- [ ] **Step 4: Install and run the test to verify it fails for the right reason**

```bash
npm install
npm test -- tests/interpreter.test.ts
```

Expected: FAIL — `result.success` is false, error contains `Invalid position reference` (tokenizer bug). If Jest cannot parse the file, fix the harness before continuing.

- [ ] **Step 5: Commit**

```bash
git add babel.config.js jest.config.js package.json package-lock.json .npmrc tests/interpreter.test.ts
git commit -m "test: add Jest harness and failing MOVE P[1] smoke test"
```

---

### Task 2: Fix the tokenizer

**Files:**
- Modify: `app/utils/interpreter.ts` (identifier loop ~499–503)
- Test: `tests/interpreter.test.ts`

**Interfaces:**
- Consumes: `tokenize` private method
- Produces: `MOVE P[1]` tokens `MOVE`, `P`, `[`, `1`, `]` so `parsePositionRef(tokens, 1)` works

- [ ] **Step 1: Add tokenizer-focused tests**

Add to `tests/interpreter.test.ts`:

```typescript
describe('tokenization via public commands', () => {
  it('parses DOUT OT[1]=ON', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('DOUT OT[1]=ON\nEND');
    expect(result.success).toBe(true);
    expect(result.state.io.DO[1]).toBe(true);
  });

  it('rejects P[0]', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('MOVE P[0]\nEND');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/1-100|index/i);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: FAIL on MOVE and DOUT (same tokenizer bug).

- [ ] **Step 3: Fix identifier charset and add bounds in parsers**

In `app/utils/interpreter.ts`, change the identifier scan from `/[a-zA-Z0-9_\[\]]/` to `/[a-zA-Z0-9_]/`:

```typescript
      if (/[a-zA-Z_]/.test(line[i])) {
        let ident = '';
        while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
          ident += line[i++];
        }
        const isCommand = ['MOVE', 'J', 'L', 'DOUT', 'WAIT', 'IF', 'FOR', 'END', 'ENDIF', 'ENDFOR', 'THEN', 'ELSE', 'CALL', 'ON', 'OFF', 'TO', 'DIN'].includes(ident.toUpperCase());
        tokens.push({ type: isCommand ? 'COMMAND' : 'IDENTIFIER', value: ident, lineNumber: 0 });
        continue;
      }
```

In `parsePositionRef`, after reading `index`, throw if `index < 1 || index > 100`. Same for `parseRegisterRef`. In `parseIORef`, throw if `index < 1 || index > 32`. In `executeDOUT`, after parsing `outputIndex`, apply the same 1–32 check.

Also treat leading `-` before a digit as part of a NUMBER so later expression tests can use negatives:

```typescript
      if (
        /\d/.test(line[i]) ||
        (line[i] === '.' && /\d/.test(line[i + 1] ?? '')) ||
        (line[i] === '-' && /\d/.test(line[i + 1] ?? ''))
      ) {
        let numStr = '';
        if (line[i] === '-') numStr += line[i++];
        while (i < line.length && (/\d/.test(line[i]) || line[i] === '.')) {
          numStr += line[i++];
        }
        tokens.push({ type: 'NUMBER', value: numStr, lineNumber: 0 });
        continue;
      }
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: PASS for MOVE, DOUT, P[0]. WAIT/IF/FOR tests are not in this file yet.

- [ ] **Step 5: Commit**

```bash
git add app/utils/interpreter.ts tests/interpreter.test.ts
git commit -m "fix: tokenize brackets as punctuation so MOVE and DOUT parse"
```

---

### Task 3: Source-line program counter and shared run loop

**Files:**
- Modify: `app/utils/interpreter.ts` (`ExecutionContext`, `preprocessProgram`, `execute`, `continue`, `pause`, `step`, `reset`)
- Test: `tests/interpreter.test.ts`

**Interfaces:**
- Consumes: existing `executeLine`
- Produces:
  - `ExecutionContext.didJump: boolean`
  - `ExecutionContext.loopStack: LoopFrame[]`
  - `execute()` loads source lines, sets PC=0, calls `runLoop()`
  - `continue()` does **not** reset PC or log; calls `runLoop()`
  - `pause()` is observed by `runLoop`

```typescript
interface LoopFrame {
  headerLine: number;
  bodyStart: number;
  variable: string;
  current: number;
  end: number;
  registerIndex: number;
}
```

Extend `ExecutionContext`:

```typescript
interface ExecutionContext {
  state: InterpreterState;
  lines: string[];
  log: string[];
  stopExecution: boolean;
  pauseUntil?: number;
  didJump: boolean;
  loopStack: LoopFrame[];
}
```

- [ ] **Step 1: Write failing continue/pause/line-number tests**

```typescript
describe('run loop', () => {
  it('keeps comment lines so PC matches the editor', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 5, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    const program = `; comment\nMOVE P[1]\nEND`;
    const result = await vm.execute(program);
    expect(result.success).toBe(true);
    expect(result.executionLog.some((l) => l.includes('[1] MOVE'))).toBe(true);
  });

  it('continue after breakpoint does not restart from line 0', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 1, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    vm.definePosition(2, { x: 2, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    vm.addBreakPoint(1); // 0-based: MOVE P[2]
    const first = await vm.execute('MOVE P[1]\nMOVE P[2]\nEND');
    expect(first.state.isPaused).toBe(true);
    expect(first.state.currentPosition?.x).toBe(1);
    const resumed = await vm.continue();
    expect(resumed.success).toBe(true);
    expect(resumed.state.currentPosition?.x).toBe(2);
    expect(resumed.executionLog.some((l) => l.includes('MOVE P[1]'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: FAIL — continue re-executes from PC 0 (or comment line numbers are wrong).

- [ ] **Step 3: Rewrite preprocess + extract runLoop**

`preprocessProgram` must keep blanks and `;` comments. Only drop metadata:

```typescript
  private preprocessProgram(program: string): string[] {
    return program.split('\n').filter((raw) => {
      const t = raw.trim().toUpperCase();
      if (t.startsWith('/PROG') || t.startsWith('/BODY') || t.startsWith('/ATTR')) return false;
      if (t.startsWith('/COMMENT') || t.startsWith('/ACCESS') || t.startsWith('/REL') || t.startsWith('/PTP')) return false;
      return true;
    });
  }
```

Replace the body of `execute` after building `lines` with context init + `return this.runLoop(startTime)`. Remove `this.asyncWaitTimestamp` usage from the loop (Task 4 deletes the field).

```typescript
  private async runLoop(startTime: number): Promise<ExecutionResult> {
    if (!this.context) {
      throw new Error('No execution context');
    }

    this.state.isRunning = true;

    while (
      this.state.programCounter < this.context.lines.length &&
      !this.context.stopExecution &&
      !this.state.isPaused
    ) {
      const lineNumber = this.state.programCounter;
      const line = this.context.lines[lineNumber] ?? '';
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith(';')) {
        this.state.programCounter++;
        continue;
      }

      if (this.state.breakPoints.has(lineNumber)) {
        this.context.log.push(`[BREAKPOINT] Line ${lineNumber}: ${trimmed}`);
        this.state.isPaused = true;
        break;
      }

      this.context.didJump = false;
      try {
        await this.executeLine(trimmed, lineNumber);
      } catch (err) {
        throw new Error(`Line ${lineNumber}: ${(err as Error).message}`);
      }

      if (this.context.stopExecution || this.state.isPaused) {
        break;
      }

      if (!this.context.didJump) {
        this.state.programCounter++;
      }
    }

    this.state.isRunning = false;
    return {
      success: true,
      state: this.getState(),
      executionLog: this.context.log,
      nextLineNumber: this.state.programCounter,
      currentLine:
        this.state.programCounter < this.context.lines.length
          ? this.context.lines[this.state.programCounter]
          : 'END',
      elapsedMs: Date.now() - startTime,
    };
  }
```

`execute`:

```typescript
      this.context = {
        state: this.state,
        lines,
        log: [],
        stopExecution: false,
        didJump: false,
        loopStack: [],
      };
      this.state.isRunning = true;
      this.state.isPaused = false;
      this.state.programCounter = 0;
      return await this.runLoop(startTime);
```

`continue`:

```typescript
  public async continue(): Promise<ExecutionResult> {
    if (!this.context) {
      return {
        success: false,
        error: 'No program running',
        state: this.getState(),
        executionLog: [],
        elapsedMs: 0,
      };
    }
    this.state.isPaused = false;
    if (this.state.breakPoints.has(this.state.programCounter)) {
      this.state.programCounter++;
    }
    return this.runLoop(Date.now());
  }
```

`executeLine` `END` case must set `this.context.stopExecution = true`.

`step` should skip comments the same way and must not require a full `execute` first if context exists. Leave `step` using `context.lines` and incrementing PC; do not call `execute()`.

Delete field `asyncWaitTimestamp` in Task 4; for this task, stop reading it in the loop so it cannot abort early.

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: PASS including continue/breakpoint.

- [ ] **Step 5: Commit**

```bash
git add app/utils/interpreter.ts tests/interpreter.test.ts
git commit -m "fix: resumable run loop with source-line program counter"
```

---

### Task 4: WAIT actually waits

**Files:**
- Modify: `app/utils/interpreter.ts` (`executeWAIT`, remove `asyncWaitTimestamp`)
- Test: `tests/interpreter.test.ts`

**Interfaces:**
- Consumes: `runLoop` pause flag
- Produces: `executeWAIT` awaits sleep; `WAIT DIN` polls every 100ms until DI is true or paused

- [ ] **Step 1: Write failing WAIT tests**

```typescript
describe('WAIT', () => {
  it('delays then continues', async () => {
    const vm = new FANUCInterpreter();
    const started = Date.now();
    const result = await vm.execute('WAIT 0.05\nDOUT OT[1]=ON\nEND');
    expect(result.success).toBe(true);
    expect(Date.now() - started).toBeGreaterThanOrEqual(45);
    expect(result.state.io.DO[1]).toBe(true);
  });

  it('WAIT DIN unblocks when input goes high', async () => {
    const vm = new FANUCInterpreter();
    const run = vm.execute('WAIT DIN(DI[1])\nDOUT OT[2]=ON\nEND');
    setTimeout(() => vm.setDigitalInput(1, true), 30);
    const result = await run;
    expect(result.success).toBe(true);
    expect(result.state.io.DO[2]).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: FAIL — DO not set (early success) and/or elapsed ~0ms. After Task 2, DIN may parse; if it still fails, the poll path is wrong.

- [ ] **Step 3: Implement real WAIT**

Remove `private asyncWaitTimestamp`. Add:

```typescript
  private async sleep(ms: number): Promise<void> {
    const end = Date.now() + ms;
    while (Date.now() < end) {
      if (this.state.isPaused || this.context?.stopExecution) return;
      await new Promise<void>((resolve) => setTimeout(resolve, Math.min(20, end - Date.now())));
    }
  }
```

Replace `executeWAIT`:

```typescript
  private async executeWAIT(tokens: Token[], lineNumber: number): Promise<void> {
    if (!this.context) throw new Error('No execution context');

    const secondToken = tokens[1];
    if (secondToken?.type === 'NUMBER') {
      const seconds = parseFloat(secondToken.value);
      this.context.log.push(`[${lineNumber}] WAIT ${seconds}s`);
      await this.sleep(seconds * 1000);
      return;
    }

    if (secondToken?.value.toUpperCase() === 'DIN') {
      const { index } = this.parseIORef(tokens, tokens.findIndex((t) => t.value.toUpperCase() === 'DI'));
      this.context.log.push(`[${lineNumber}] WAIT DIN(DI[${index}])`);
      while (!this.state.io.DI[index] && !this.state.isPaused && !this.context.stopExecution) {
        await this.sleep(100);
      }
      return;
    }

    throw new Error('WAIT expects seconds or DIN(DI[n])');
  }
```

If `parseIORef` is awkward from the DIN token list, parse `DI` + `[` + number + `]` by scanning tokens after `(` the same way `parseIORef` already does.

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/interpreter.ts tests/interpreter.test.ts
git commit -m "fix: WAIT blocks with real async sleep and DIN polling"
```

---

### Task 5: IF / ELSE / ENDIF

**Files:**
- Modify: `app/utils/interpreter.ts` (`executeIF`, `executeLine` cases for ELSE/THEN/ENDIF)
- Test: `tests/interpreter.test.ts`

**Interfaces:**
- Consumes: `context.didJump`, `evaluateCondition`
- Produces: true branch skips ELSE; false branch runs ELSE; `ELSE` is never `Unknown command`

- [ ] **Step 1: Write failing IF tests**

```typescript
describe('IF/ELSE', () => {
  it('runs THEN and skips ELSE when true', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute(
      'PR[1]=75\nIF (PR[1]>50)\nPR[2]=1\nELSE\nPR[2]=2\nENDIF\nEND'
    );
    expect(result.success).toBe(true);
    expect(result.state.registers.PR[2]).toBe(1);
  });

  it('runs ELSE when false', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute(
      'PR[1]=10\nIF (PR[1]>50)\nPR[2]=1\nELSE\nPR[2]=2\nENDIF\nEND'
    );
    expect(result.success).toBe(true);
    expect(result.state.registers.PR[2]).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: FAIL — true branch throws `Unknown command: ELSE` and/or false branch leaves `PR[2]===0`.

- [ ] **Step 3: Implement skip helpers and IF**

```typescript
  private findMatchingElseOrEndif(from: number): { elseLine: number | null; endifLine: number } {
    if (!this.context) throw new Error('No execution context');
    let elseLine: number | null = null;
    for (let i = from; i < this.context.lines.length; i++) {
      const cmd = this.context.lines[i].trim().toUpperCase();
      if (cmd === 'ELSE' || cmd.startsWith('ELSE ')) {
        elseLine = i;
      }
      if (cmd === 'ENDIF' || cmd.startsWith('ENDIF ')) {
        return { elseLine, endifLine: i };
      }
    }
    throw new Error('Missing ENDIF');
  }
```

```typescript
  private executeIF(_tokens: Token[], lineNumber: number, fullLine: string): void {
    if (!this.context) throw new Error('No execution context');
    const open = fullLine.indexOf('(');
    const close = fullLine.lastIndexOf(')');
    if (open === -1 || close === -1) throw new Error('IF requires (condition)');
    const conditionStr = fullLine.substring(open + 1, close);
    const conditionResult = this.evaluateCondition(conditionStr);
    this.context.log.push(`[${lineNumber}] IF (${conditionStr}) = ${conditionResult}`);
    const { elseLine, endifLine } = this.findMatchingElseOrEndif(lineNumber + 1);
    if (conditionResult) {
      this.context.didJump = false;
    } else {
      this.state.programCounter = (elseLine !== null ? elseLine + 1 : endifLine + 1);
      this.context.didJump = true;
    }
  }
```

In `executeLine`:

```typescript
      case 'THEN':
        break;
      case 'ELSE': {
        const { endifLine } = this.findMatchingElseOrEndif(lineNumber + 1);
        this.state.programCounter = endifLine + 1;
        this.context.didJump = true;
        this.context.log.push(`[${lineNumber}] ELSE`);
        break;
      }
      case 'ENDIF':
        this.context.log.push(`[${lineNumber}] ENDIF`);
        break;
```

Remove `ENDIF` from the combined `END`/`ENDIF`/`ENDFOR` case so ENDIF does not stop the program.

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/interpreter.ts tests/interpreter.test.ts
git commit -m "fix: IF/ELSE/ENDIF control flow without double PC increment"
```

---

### Task 6: FOR / ENDFOR and P[J]

**Files:**
- Modify: `app/utils/interpreter.ts` (`executeFOR`, `ENDFOR`, `parsePositionRef`)
- Test: `tests/interpreter.test.ts`

**Interfaces:**
- Consumes: `context.loopStack`
- Produces: `FOR J=1 TO 3` iterates 3 times; `J` writes `PR[1]`; `MOVE P[J]` uses that register

- [ ] **Step 1: Write failing FOR tests**

```typescript
describe('FOR', () => {
  it('iterates and supports P[J]', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 10, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    vm.definePosition(2, { x: 20, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    vm.definePosition(3, { x: 30, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    const result = await vm.execute(
      'PR[2]=0\nFOR J=1 TO 3\nPR[2]=PR[2]+1\nMOVE P[J]\nENDFOR\nEND'
    );
    expect(result.success).toBe(true);
    expect(result.state.registers.PR[2]).toBe(3);
    expect(result.state.currentPosition?.x).toBe(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/interpreter.test.ts -t 'iterates'
```

Expected: FAIL — `PR[2]` is 1 (single pass) and/or `MOVE P[J]` throws.

- [ ] **Step 3: Implement loop stack and indexed P refs**

`parsePositionRef`: if the token after `[` is `IDENTIFIER` `J` (or `PR` + `[` + n + `]`), resolve `this.state.registers.PR[1]` for `J`, or the named register, then require `]`.

```typescript
  private executeFOR(_tokens: Token[], lineNumber: number, fullLine: string): void {
    if (!this.context) throw new Error('No execution context');
    const forMatch = fullLine.match(/FOR\s+(\w+)\s*=\s*(-?\d+)\s+TO\s*(-?\d+)/i);
    if (!forMatch) throw new Error('Invalid FOR syntax');
    const variable = forMatch[1].toUpperCase();
    const start = parseInt(forMatch[2], 10);
    const end = parseInt(forMatch[3], 10);
    const registerIndex = variable === 'J' || !/\d/.test(variable) ? 1 : parseInt(variable.replace(/\D/g, ''), 10);
    this.state.registers.PR[registerIndex] = start;
    this.context.loopStack.push({
      headerLine: lineNumber,
      bodyStart: lineNumber + 1,
      variable,
      current: start,
      end,
      registerIndex,
    });
    this.context.log.push(`[${lineNumber}] FOR ${variable}=${start} TO ${end}`);
  }
```

`ENDFOR` case in `executeLine`:

```typescript
      case 'ENDFOR': {
        const frame = this.context.loopStack[this.context.loopStack.length - 1];
        if (!frame) throw new Error('ENDFOR without FOR');
        frame.current += 1;
        this.state.registers.PR[frame.registerIndex] = frame.current;
        if (frame.current <= frame.end) {
          this.state.programCounter = frame.bodyStart;
          this.context.didJump = true;
        } else {
          this.context.loopStack.pop();
        }
        this.context.log.push(`[${lineNumber}] ENDFOR`);
        break;
      }
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/interpreter.ts tests/interpreter.test.ts
git commit -m "fix: FOR/ENDFOR loop stack and MOVE P[J]"
```

---

### Task 7: Expressions, J/L speed, getState, CALL

**Files:**
- Modify: `app/utils/interpreter.ts` (`evaluateExpression`, `executeJ`, `executeL`, `getState`, `executeCALL`)
- Test: `tests/interpreter.test.ts`

**Interfaces:**
- Consumes: `parsePositionRef` `nextIdx`
- Produces: `PR[3]=PR[1]+PR[2]` → 80; `getState().breakPoints.has(n)`; CALL fails clearly; J/L log the parsed speed

- [ ] **Step 1: Write failing tests**

```typescript
describe('expressions and snapshots', () => {
  it('adds two registers', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('PR[1]=50\nPR[2]=30\nPR[3]=PR[1]+PR[2]\nEND');
    expect(result.success).toBe(true);
    expect(result.state.registers.PR[3]).toBe(80);
  });

  it('preserves breakpoints in getState', () => {
    const vm = new FANUCInterpreter();
    vm.addBreakPoint(4);
    expect(vm.getState().breakPoints.has(4)).toBe(true);
  });

  it('rejects CALL as unimplemented', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('CALL LESSON2\nEND');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not implemented/i);
  });

  it('reads J speed after the position ref', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 1, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    const result = await vm.execute('J P[1] 40%\nEND');
    expect(result.success).toBe(true);
    expect(result.executionLog.join('\n')).toMatch(/40%/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: FAIL on PR[3] (50), `breakPoints.has` (not a function), CALL success, J log `100%`.

- [ ] **Step 3: Implement**

`evaluateExpression` — check arithmetic with two PR refs first:

```typescript
    const twoPr = trimmed.match(/PR\[(\d+)\]\s*([+\-*/])\s*PR\[(\d+)\]/i);
    if (twoPr) {
      const left = this.state.registers.PR[parseInt(twoPr[1], 10)] ?? 0;
      const right = this.state.registers.PR[parseInt(twoPr[3], 10)] ?? 0;
      return this.applyArith(left, twoPr[2], right);
    }
    const onePr = trimmed.match(/PR\[(\d+)\]\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)/i);
    if (onePr) {
      const left = this.state.registers.PR[parseInt(onePr[1], 10)] ?? 0;
      return this.applyArith(left, onePr[2], parseFloat(onePr[3]));
    }
```

```typescript
  private applyArith(left: number, op: string, right: number): number {
    if (op === '/' && right === 0) throw new Error('Division by zero');
    if (op === '+') return left + right;
    if (op === '-') return left - right;
    if (op === '*') return left * right;
    if (op === '/') return left / right;
    throw new Error(`Unknown operator ${op}`);
  }
```

Keep the existing number-literal and bare `PR[n]` branches after the two-PR match.

`executeJ` / `executeL`:

```typescript
      const { index, nextIdx } = this.parsePositionRef(tokens, 1);
      const speedToken = tokens[nextIdx];
      const speed = speedToken?.type === 'NUMBER' ? parseInt(speedToken.value, 10) : 100;
```

`getState`:

```typescript
  public getState(): InterpreterState {
    return {
      positions: Object.fromEntries(
        Object.entries(this.state.positions).map(([k, v]) => [k, { ...v }])
      ),
      registers: { PR: { ...this.state.registers.PR } },
      io: { DI: { ...this.state.io.DI }, DO: { ...this.state.io.DO } },
      currentPosition: this.state.currentPosition ? { ...this.state.currentPosition } : null,
      programCounter: this.state.programCounter,
      callStack: [...this.state.callStack],
      isRunning: this.state.isRunning,
      isPaused: this.state.isPaused,
      breakPoints: new Set(this.state.breakPoints),
    };
  }
```

`executeCALL`:

```typescript
    throw new Error('CALL is not implemented in this MVP');
```

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/interpreter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/utils/interpreter.ts tests/interpreter.test.ts
git commit -m "fix: register math, breakpoint clone, J/L speed, honest CALL"
```

---

### Task 8: Store — breakpoints, sync, resume, seeded positions

**Files:**
- Modify: `app/store/types.ts`
- Modify: `app/store/index.ts`
- Modify: `app/store/hooks.ts` (drop unused `useCallback`)
- Create: `tests/store.test.ts`

**Interfaces:**
- Consumes: repaired `FANUCInterpreter`
- Produces: `breakpointLines: number[]`; `syncFromResult`; `resumeExecution` uses `continue`; init seeds P[1]/P[2]

- [ ] **Step 1: Write failing store tests**

```typescript
import { useAppStore } from '../app/store';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.getState().reset();
  });

  it('adds breakpoints without throwing', () => {
    expect(() => useAppStore.getState().addBreakpoint(3)).not.toThrow();
    expect(useAppStore.getState().breakpointLines).toContain(3);
  });

  it('runs the default program', async () => {
    await useAppStore.getState().runProgram();
    const s = useAppStore.getState();
    expect(s.lastError).toBeNull();
    expect(s.interpreterState.currentPosition?.x).toBe(150);
    expect(s.interpreterState.io.DO[1]).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/store.test.ts
```

Expected: FAIL — Immer MapSet error and/or default program error / positions at origin.

- [ ] **Step 3: Change types and store implementation**

`app/store/types.ts`:

```typescript
  breakpointLines: number[];
```

`app/store/index.ts`:

- Import only `AppStore` (drop unused `AppState`, `AppActions`) or prefix unused with `_` — prefer delete unused imports.
- Seed positions after constructing one interpreter:

```typescript
function createSeededInterpreter(): FANUCInterpreter {
  const vm = new FANUCInterpreter();
  vm.definePosition(1, { x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0 });
  vm.definePosition(2, { x: 150, y: 250, z: 350, rx: 45, ry: 0, rz: 0 });
  return vm;
}

const initialInterpreter = createSeededInterpreter();
```

Initial state:

```typescript
    interpreter: initialInterpreter,
    interpreterState: initialInterpreter.getState(),
    breakpointLines: [],
```

History cap — evict oldest:

```typescript
        if (state.programHistory[state.historyIndex] !== program) {
          state.programHistory = state.programHistory.slice(0, state.historyIndex + 1);
          state.programHistory.push(program);
          if (state.programHistory.length > MAX_HISTORY) {
            state.programHistory.shift();
          }
          state.historyIndex = state.programHistory.length - 1;
        }
```

Shared sync (plain function inside the create callback):

```typescript
    // inside each execution action's set():
          s.executionResult = result;
          s.interpreterState = result.state;
          s.executionLogs = result.executionLog;
          s.isRunning = false;
          s.isPaused = result.state.isPaused;
          s.lastError = result.success ? null : result.error || 'Unknown error';
          s.errorTimestamp = result.success ? null : Date.now();
```

Apply that block in `runProgram`, `resumeExecution`, and `stepExecution`.

Breakpoints — mutate arrays; call interpreter **outside** `set`:

```typescript
    addBreakpoint: (lineNumber: number) => {
      get().interpreter.addBreakPoint(lineNumber);
      set((state) => {
        if (!state.breakpointLines.includes(lineNumber)) {
          state.breakpointLines.push(lineNumber);
        }
      });
    },
    removeBreakpoint: (lineNumber: number) => {
      get().interpreter.removeBreakPoint(lineNumber);
      set((state) => {
        state.breakpointLines = state.breakpointLines.filter((n) => n !== lineNumber);
      });
    },
    clearBreakpoints: () => {
      const lines = get().breakpointLines;
      const interpreter = get().interpreter;
      lines.forEach((line) => interpreter.removeBreakPoint(line));
      set((state) => {
        state.breakpointLines = [];
      });
    },
```

`reset`:

```typescript
    reset: () => {
      const interpreter = createSeededInterpreter();
      set(() => ({
        program: INITIAL_PROGRAM,
        programHistory: [INITIAL_PROGRAM],
        historyIndex: 0,
        interpreter,
        interpreterState: interpreter.getState(),
        executionResult: null,
        isRunning: false,
        isPaused: false,
        executionLogs: [],
        selectedTab: 'editor',
        breakpointLines: [],
        showBreakpointPanel: false,
        lastError: null,
        errorTimestamp: null,
      }));
    },
```

`pauseExecution` must also snapshot:

```typescript
        state.interpreterState = interpreter.getState();
```

`hooks.ts`: delete `import { useCallback } from 'react';`.

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/store.test.ts tests/interpreter.test.ts
```

Expected: PASS. Default program takes ~1s because of `WAIT 1.0`.

- [ ] **Step 5: Commit**

```bash
git add app/store/types.ts app/store/index.ts app/store/hooks.ts tests/store.test.ts
git commit -m "fix: store breakpoints, execution sync, and seeded demo positions"
```

---

### Task 9: Persistence that works on iOS and web

**Files:**
- Modify: `app/store/persistence.ts`
- Test: `tests/store.test.ts` (add persist cases with a memory map)

**Interfaces:**
- Consumes: `PersistedState`, `useAppStore.subscribe(listener)`
- Produces: `saveState` / `loadState` via AsyncStorage with localStorage fallback

- [ ] **Step 1: Write a persistence unit test using a mock**

At the top of a new describe in `tests/store.test.ts`, mock:

```typescript
const memory = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (k: string, v: string) => {
    memory.set(k, v);
  }),
  getItem: jest.fn(async (k: string) => memory.get(k) ?? null),
  removeItem: jest.fn(async (k: string) => {
    memory.delete(k);
  }),
}));
```

```typescript
  it('round-trips program through saveState/loadState', async () => {
    memory.clear();
    useAppStore.getState().setProgram('MOVE P[1]\nEND');
    const { saveState, loadState } = await import('../app/store/persistence');
    await saveState();
    const loaded = await loadState();
    expect(loaded?.program).toContain('MOVE P[1]');
  });
```

If the mock must be hoisted, put `jest.mock` at file top and import persistence statically.

- [ ] **Step 2: Run test to verify it fails or no-ops**

```bash
npm test -- tests/store.test.ts
```

Expected: FAIL or `loaded === null` because current code only writes `window.localStorage`.

- [ ] **Step 3: Implement storage helper**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function writeItem(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }
}

async function readItem(key: string): Promise<string | null> {
  try {
    const fromNative = await AsyncStorage.getItem(key);
    if (fromNative != null) return fromNative;
  } catch {
    // fall through
  }
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
}
```

`saveState` / `loadState` / `clearPersistedState` use these helpers. No `typeof window` gate.

`useAutoSaveState`:

```typescript
    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.program === prev.program && state.breakpointLines === prev.breakpointLines) {
        return;
      }
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void saveState();
      }, debounceMs);
    });
```

Vanilla Zustand v4 `subscribe` is `(listener: (state, prev) => void) => unsubscribe`. One argument only.

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/store.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/store/persistence.ts tests/store.test.ts package.json package-lock.json
git commit -m "fix: persist with AsyncStorage and vanilla Zustand subscribe"
```

---

### Task 10: Expo boot, assets, and type-safe barrels

**Files:**
- Create: `App.tsx`
- Create: `assets/icon.png`, `assets/splash.png`, `assets/adaptive-icon.png`, `assets/favicon.png`
- Modify: `app/components/index.ts`
- Modify: `app/components/RobotArm.web.tsx`
- Modify: `app/components/CodeEditor.tsx`

**Interfaces:**
- Consumes: `app/App.tsx` default export
- Produces: Expo `AppEntry` resolves `../../App`; barrel exports only real symbols

- [ ] **Step 1: Create root App re-export**

```typescript
// App.tsx
export { default } from './app/App';
```

- [ ] **Step 2: Generate placeholder assets**

```bash
python3 - <<'PY'
from pathlib import Path
png = bytes.fromhex(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489'
    '0000000d4944415478da6360000002000100ffff03000006000557bf0000000049454e44ae426082'
)
Path('assets').mkdir(exist_ok=True)
for name in ('icon.png', 'splash.png', 'adaptive-icon.png', 'favicon.png'):
    Path('assets', name).write_bytes(png)
PY
```

- [ ] **Step 3: Fix barrel and web fallback**

`app/components/index.ts` — delete the `RobotArmModel` named export:

```typescript
export { RobotArmViewer } from './RobotArm';
export type { RobotArmProps, Position as RobotPosition } from './RobotArm';
```

`RobotArm.web.tsx` — remove `Canvas as SkiaCanvas` from the `react-native` import. Replace lowercase `<view>` with `<Text>`:

```tsx
        <Text style={styles.fallbackText}>
          3D rendering not available on this platform
        </Text>
```

`CodeEditor.tsx`:

- Remove unused `Dimensions`, `cursorPosition`, `handleSave` / `onSave` usage if `onSave` stays on the props interface (keep the optional prop, do not bind unused handlers).
- Delete `fontFamily` and `fontSize` as `TextInput` props (keep them on `styles.input`).
- Placeholder:

```tsx
              placeholder={'; Enter FANUC program here\n\nMOVE P[1]\nDOUT OT[1]=ON\nWAIT 1.0\nEND'}
```

- [ ] **Step 4: Type-check**

```bash
npm run type-check
```

Expected: remaining errors are only in files not yet touched (App.tsx `lastError`, Viewport3D, persistence if leftover). Fix any error in the files this task edited. If `RobotArm.tsx` still type-errors, fix unused imports (`useFrame`) in the same commit so `tsc` can pass later.

- [ ] **Step 5: Commit**

```bash
git add App.tsx assets app/components/index.ts app/components/RobotArm.web.tsx app/components/CodeEditor.tsx app/components/RobotArm.tsx
git commit -m "fix: Expo root entry, assets, and invalid RN exports"
```

---

### Task 11: Play / Resume wiring and live layout

**Files:**
- Modify: `app/components/ExecutionControls.tsx`
- Modify: `app/App.tsx`
- Modify: `app/components/Viewport3D.tsx`

**Interfaces:**
- Consumes: `resumeExecution` from the store
- Produces: paused Play button calls `onResume`; portrait includes viewport; projection uses `onLayout`

- [ ] **Step 1: Add onResume to ExecutionControls**

```typescript
export interface ExecutionControlsProps {
  isRunning: boolean;
  isPaused: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onResume?: () => void;
  onBreakpoint?: () => void;
  status?: string;
  errorMessage?: string | null;
}
```

```typescript
  const handlePlayPress = useCallback(() => {
    if (isPaused) {
      (onResume ?? onPlay)();
    } else if (!isRunning) {
      onPlay();
    }
  }, [isPaused, isRunning, onPlay, onResume]);
```

Change `errorMessage &&` to `!!errorMessage &&` so `null` is allowed. Remove `numberOfLines={1}` or set `numberOfLines={3}` so full interpreter errors are visible.

- [ ] **Step 2: Wire App.tsx**

In both layouts, pass `onResume={handleResume}`.

Replace module-level orientation with:

```typescript
import { useWindowDimensions } from 'react-native';

export default function App() {
  useRestorePersistedState();
  useAutoSaveState(1000);
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  return (
    <SafeAreaView style={styles.safeArea}>
      {Platform.OS === 'android' && (
        <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      )}
      {isLandscape ? <LandscapeLayout /> : <PortraitLayout />}
    </SafeAreaView>
  );
}
```

Add `Viewport3D` to `PortraitLayout` (same props as landscape). Pass `isLoading={false}` (not `isRunning`).

Breakpoint button: `addBreakpoint(interpreterState.programCounter)` is already 0-based after Task 3 — keep it.

- [ ] **Step 3: Fix Viewport3D projection**

Use state from `onLayout`:

```typescript
  const [size, setSize] = useState({ width: 0, height: 0 });
  const centerX = size.width / 2;
  const centerY = size.height / 2;
  const radius = Math.min(size.width, size.height) * 0.35;
  const maxCoord = 400;
  const projectedX = currentPosition
    ? centerX + (currentPosition.x / maxCoord) * radius
    : centerX;
  const projectedY = currentPosition
    ? centerY - (currentPosition.y / maxCoord) * radius
    : centerY;
```

Origin and end-effector use those pixel values (`left`/`top` with half-size offsets). Delete `transformOrigin` link line or draw it from `(centerX, centerY)` to `(projectedX, projectedY)` using the same numbers (length = hypot, angle = atan2). Remove the Phase 4 student-facing note.

- [ ] **Step 4: Type-check**

```bash
npm run type-check
```

Expected: PASS. If `IOPanel` style union errors remain (`value && styles.ioItemActive`), change to `value ? styles.ioItemActive : undefined`.

- [ ] **Step 5: Commit**

```bash
git add app/App.tsx app/components/ExecutionControls.tsx app/components/Viewport3D.tsx app/components/IOPanel.tsx
git commit -m "fix: resume wiring, live orientation, and viewport projection"
```

---

### Task 12: Rewrite integration tests and honest docs

**Files:**
- Modify: `tests/integration.test.ts`
- Modify: `README.md`
- Modify: `PHASE1_COMPLETE.md`

**Interfaces:**
- Consumes: repaired interpreter + store
- Produces: Jest suite that fails on regression; docs that match behavior

- [ ] **Step 1: Replace integration.test.ts**

Delete `console.assert` helpers and `runAllTests`. Use Jest:

```typescript
import { FANUCInterpreter } from '../app/utils/interpreter';
import { useAppStore } from '../app/store';

describe('default lesson program', () => {
  it('runs MOVE / DOUT / WAIT / MOVE through the interpreter', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0 });
    vm.definePosition(2, { x: 150, y: 250, z: 350, rx: 45, ry: 0, rz: 0 });
    const result = await vm.execute(`MOVE P[1]
DOUT OT[1]=ON
WAIT 0.05
MOVE P[2]
DOUT OT[1]=OFF
END`);
    expect(result.success).toBe(true);
    expect(result.state.currentPosition?.x).toBe(150);
    expect(result.state.io.DO[1]).toBe(false);
  });

  it('runs the same program through the store', async () => {
    useAppStore.getState().reset();
    useAppStore.getState().setProgram(`MOVE P[1]
DOUT OT[1]=ON
WAIT 0.05
MOVE P[2]
DOUT OT[1]=OFF
END`);
    await useAppStore.getState().runProgram();
    const s = useAppStore.getState();
    expect(s.lastError).toBeNull();
    expect(s.interpreterState.currentPosition?.x).toBe(150);
  });
});
```

Keep additional cases from the old file only if they use `expect` and assert real behavior (IF, registers, errors). Drop `|| true`.

- [ ] **Step 2: Run the full suite**

```bash
npm test
npm run type-check
```

Expected: all tests PASS; `tsc --noEmit` exits 0.

- [ ] **Step 3: Honest docs**

`README.md` status line: Phase 1 interpreter is the engine; repair required (tokenizer, control flow, tests). CALL is not implemented. Viewport is 2D.

`PHASE1_COMPLETE.md`: change CALL row to “not implemented (throws)”. Remove “PRODUCTION READY”. Point to `docs/superpowers/specs/2026-08-15-fanuc-mvp-repair-design.md`.

Add a 4-line banner at the top of `DELIVERABLES.md`:

```
> Repair in progress: see docs/superpowers/specs/2026-08-15-fanuc-mvp-repair-design.md
> Do not treat this file as current QA status.
```

- [ ] **Step 4: Final verification**

```bash
npm test
npm run type-check
```

Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add tests/integration.test.ts README.md PHASE1_COMPLETE.md DELIVERABLES.md
git commit -m "test: replace false-green suite and document real MVP status"
```

---

## Self-review

**Spec coverage**

| Spec section | Task |
|--------------|------|
| §5.1 Tokenizer | Task 2 |
| §5.2 Source PC | Task 3 |
| §5.3 runLoop / continue / pause | Task 3 |
| §5.4 WAIT | Task 4 |
| §5.5 IF/ELSE | Task 5 |
| §5.6 FOR / P[J] | Task 6 |
| §5.7–5.10 expressions, bounds, getState, CALL | Tasks 2 and 7 |
| §6 Store / history / sync | Task 8 |
| §6.5 Persistence | Task 9 |
| §7 Boot / UI / viewport | Tasks 10–11 |
| §8 Tests | Tasks 1, 12 |
| §10 Docs | Task 12 |

**Placeholder scan:** no TBD, no “add tests later”, no “similar to Task N”.

**Type consistency:** `didJump`, `loopStack`, `breakpointLines: number[]`, `onResume`, `createSeededInterpreter`, `runLoop(startTime)` are named the same in later tasks as in earlier ones.
