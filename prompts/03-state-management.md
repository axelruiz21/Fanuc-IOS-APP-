# Prompt 3: State Management & Wiring

Feed this to Cursor after UI components are built.

---

## Task

Wire the interpreter and UI components together using state management. Make the app functional end-to-end.

## State Structure

```typescript
interface AppState {
  // Code
  code: string;
  
  // Interpreter state
  robotState: {
    positions: {[key: number]: Position};      // P[1..100]
    registers: {[key: number]: number};        // PR[1..100]
    io: {
      DI: {[key: number]: boolean};             // DI[1..32]
      DO: {[key: number]: boolean};             // DO[1..32]
    };
  };
  
  // Execution
  isRunning: boolean;
  currentLine: number;
  executionLog: ExecutionLogEntry[];
  
  // UI
  selectedPosition: number | null;
  showIOPanel: boolean;
}

interface ExecutionLogEntry {
  line: number;
  command: string;
  status: 'success' | 'error' | 'info';
  timestamp: number;
}
```

## State Management Approach

Use **Zustand** (lighter than Redux for this scope):

```typescript
// store/appStore.ts
create((set) => ({
  code: '',
  setCode: (code) => set({ code }),
  
  robotState: initialRobotState,
  updateRobotState: (state) => set({ robotState: state }),
  
  isRunning: false,
  executionLog: [],
  
  // Action: run program
  runProgram: async (code) => {
    set({ isRunning: true, executionLog: [] });
    try {
      const interpreter = new FANUCInterpreter();
      const result = interpreter.execute(code);
      set({
        robotState: result.state,
        executionLog: result.log,
        isRunning: false
      });
    } catch (e) {
      set({
        executionLog: [{ status: 'error', message: e.message }],
        isRunning: false
      });
    }
  }
}))
```

## Wiring Steps

1. **CodeEditor** → setState(code)
2. **Run button** → appStore.runProgram(code)
3. **Interpreter** → updates robotState
4. **Arm3D** → watches robotState.currentPosition, re-renders
5. **IOPanel** → watches robotState.io, updates display
6. **Console** → watches executionLog, appends entries
7. **User clicks DO toggle** → updates robotState.io, can affect conditional logic on next run

## Event Flow

```
User edits code
    ↓
CodeEditor updates store
    ↓
User clicks "Run"
    ↓
runProgram() calls interpreter
    ↓
Interpreter executes, returns result
    ↓
Store updates robotState + executionLog
    ↓
All components re-render with new state
```

## Async Considerations

For MVP, keep execution synchronous. Later we can add:
- Step-through (pause between commands)
- Async WAIT (doesn't block UI)
- Breakpoints

## Deliverable

Create:
- `app/store/appStore.ts` — Zustand store with all actions
- Wire all components to the store
- Test: edit code, click run, see arm move and I/O change in real-time

---

**Focus:** Get full data flow working. Program execution should be live on the UI.
