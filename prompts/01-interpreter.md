# Prompt 1: FANUC Interpreter Engine

Feed this to Cursor to build the core interpreter.

---

## Task

Create a FANUC TP language interpreter in TypeScript that can parse and execute simplified FANUC teach pendant programs. This is the core engine for an iOS learning app.

## Requirements

### Parser
- Parse FANUC program syntax (see fanuc-syntax.md)
- Tokenize lines, extract commands and arguments
- Support comments (lines starting with `;`)
- Handle program structure (BEGIN/END)

### Virtual Machine / Executor
Track state:
- **Positions** P[1..100] — 6D coordinates (X, Y, Z, Rx, Ry, Rz)
- **Numeric Registers** PR[1..100]
- **Digital I/O** DI[1..32], DO[1..32]
- **Program Counter** current line
- **Call Stack** for nested programs

### Commands to Execute (MVP)
```
MOVE P[n]              — Jump to position, update state
DOUT OT[n]=ON/OFF      — Set digital output
WAIT DIN(DI[n])        — Wait for condition (async)
WAIT n.n               — Wait n seconds
IF (condition) THEN ... ELSE ... ENDIF
FOR J=start TO end ... ENDFOR
END                    — Program end
```

### Output
Return execution result including:
- Success/error status
- Current state (positions, I/O)
- Execution log (what happened)
- Next position to render in 3D

## Example Usage

```typescript
const vm = new FANUCInterpreter();
vm.definePosition(1, {x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0});

const program = `
MOVE P[1]
DOUT OT[1]=ON
WAIT 1.0
MOVE P[2]
`;

const result = vm.execute(program);
console.log(result.currentPosition);  // {x: 100, ...}
console.log(result.ioState.DO[1]);    // true
```

## Deliverable

Create `app/utils/interpreter.ts` with:
- `FANUCInterpreter` class
- `execute(program: string)` method
- Type definitions for State, Position, IOState, ExecutionResult

Keep it modular — we'll hook UI to this later.

---

**Focus:** Get the interpreter working cleanly. Don't worry about UI yet.
