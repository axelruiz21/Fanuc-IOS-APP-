/**
 * Zustand Store Implementation
 * Phase 3: State Management
 * Manages all application state and interpreter integration
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { FANUCInterpreter, Position } from '../utils/interpreter';
import { AppStore } from './types';

const INITIAL_PROGRAM = `; FANUC Teach Pendant Program
; Define positions and execute movement

MOVE P[1]
DOUT OT[1]=ON
WAIT 1.0
MOVE P[2]
DOUT OT[1]=OFF
END
`;

const MAX_HISTORY = 50;

function createSeededInterpreter(): FANUCInterpreter {
  const vm = new FANUCInterpreter();
  vm.definePosition(1, { x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0 });
  vm.definePosition(2, { x: 150, y: 250, z: 350, rx: 45, ry: 0, rz: 0 });
  vm.definePosition(10, { x: 2000, y: 0, z: 0, rx: 180, ry: 0, rz: 0 });
  return vm;
}

const initialInterpreter = createSeededInterpreter();

export const useAppStore = create<AppStore>()(
  immer((set, get) => ({
    // ============================================================================
    // INITIAL STATE
    // ============================================================================

    program: INITIAL_PROGRAM,
    programHistory: [INITIAL_PROGRAM],
    historyIndex: 0,

    interpreter: initialInterpreter,
    interpreterState: initialInterpreter.getState(),
    executionResult: null,

    isRunning: false,
    isPaused: false,
    executionLogs: [],

    selectedTab: 'editor',
    breakpointLines: [],
    showBreakpointPanel: false,

    lastError: null,
    errorTimestamp: null,

    // ============================================================================
    // PROGRAM MANAGEMENT ACTIONS
    // ============================================================================

    setProgram: (program: string) => {
      set((state) => {
        state.program = program;

        if (state.programHistory[state.historyIndex] !== program) {
          state.programHistory = state.programHistory.slice(0, state.historyIndex + 1);
          state.programHistory.push(program);
          if (state.programHistory.length > MAX_HISTORY) {
            state.programHistory.shift();
          }
          state.historyIndex = state.programHistory.length - 1;
        }
      });
    },

    appendProgram: (text: string) => {
      set((state) => {
        state.program += '\n' + text;
        const newProgram = state.program;

        if (state.programHistory[state.historyIndex] !== newProgram) {
          state.programHistory = state.programHistory.slice(0, state.historyIndex + 1);
          state.programHistory.push(newProgram);
          if (state.programHistory.length > MAX_HISTORY) {
            state.programHistory.shift();
          }
          state.historyIndex = state.programHistory.length - 1;
        }
      });
    },

    clearProgram: () => {
      set((state) => {
        state.program = '';
        state.programHistory = state.programHistory.slice(0, state.historyIndex + 1);
        state.programHistory.push('');
        state.historyIndex = state.programHistory.length - 1;
      });
    },

    undo: () => {
      set((state) => {
        if (state.historyIndex > 0) {
          state.historyIndex--;
          state.program = state.programHistory[state.historyIndex];
        }
      });
    },

    redo: () => {
      set((state) => {
        if (state.historyIndex < state.programHistory.length - 1) {
          state.historyIndex++;
          state.program = state.programHistory[state.historyIndex];
        }
      });
    },

    // ============================================================================
    // EXECUTION CONTROL ACTIONS
    // ============================================================================

    runProgram: async () => {
      set((state) => {
        state.isRunning = true;
        state.isPaused = false;
        state.executionLogs = [];
        state.lastError = null;
      });

      try {
        const state = get();
        const result = await state.interpreter.execute(state.program);

        set((s) => {
          s.executionResult = result;
          s.interpreterState = result.state;
          s.executionLogs = result.executionLog;
          s.isRunning = false;
          s.isPaused = result.state.isPaused;
          s.lastError = result.success ? null : result.error || 'Unknown error';
          s.errorTimestamp = result.success ? null : Date.now();
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        set((state) => {
          state.isRunning = false;
          state.lastError = message;
          state.errorTimestamp = Date.now();
        });
      }
    },

    pauseExecution: () => {
      const interpreter = get().interpreter;
      interpreter.pause();

      set((state) => {
        state.isPaused = true;
        state.isRunning = false;
        state.interpreterState = interpreter.getState();
      });
    },

    resumeExecution: async () => {
      set((state) => {
        state.isRunning = true;
        state.isPaused = false;
      });

      try {
        const state = get();
        const result = await state.interpreter.continue();

        set((s) => {
          s.executionResult = result;
          s.interpreterState = result.state;
          s.executionLogs = result.executionLog;
          s.isRunning = false;
          s.isPaused = result.state.isPaused;
          s.lastError = result.success ? null : result.error || 'Unknown error';
          s.errorTimestamp = result.success ? null : Date.now();
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        set((state) => {
          state.isRunning = false;
          state.lastError = message;
          state.errorTimestamp = Date.now();
        });
      }
    },

    stepExecution: async () => {
      try {
        const state = get();
        const result = await state.interpreter.step();

        set((s) => {
          s.executionResult = result;
          s.interpreterState = result.state;
          s.executionLogs = result.executionLog;
          s.isPaused = result.state.isPaused;
          s.lastError = result.success ? null : result.error || 'Unknown error';
          s.errorTimestamp = result.success ? null : Date.now();
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        set((state) => {
          state.lastError = message;
          state.errorTimestamp = Date.now();
        });
      }
    },

    resetExecution: () => {
      const breakpointLines = get().breakpointLines;
      const interpreter = createSeededInterpreter();
      breakpointLines.forEach((line) => interpreter.addBreakPoint(line));

      set((state) => {
        state.interpreter = interpreter;
        state.interpreterState = interpreter.getState();
        state.executionResult = null;
        state.executionLogs = [];
        state.isRunning = false;
        state.isPaused = false;
        state.lastError = null;
      });
    },

    // ============================================================================
    // INTERPRETER CONTROL ACTIONS
    // ============================================================================

    definePosition: (index: number, position: Position) => {
      const interpreter = get().interpreter;
      try {
        interpreter.definePosition(index, position);
        set((state) => {
          state.interpreterState = interpreter.getState();
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to define position';
        set((state) => {
          state.lastError = message;
          state.errorTimestamp = Date.now();
        });
      }
    },

    setDigitalInput: (index: number, value: boolean) => {
      const interpreter = get().interpreter;
      try {
        interpreter.setDigitalInput(index, value);
        set((state) => {
          state.interpreterState = interpreter.getState();
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set digital input';
        set((state) => {
          state.lastError = message;
          state.errorTimestamp = Date.now();
        });
      }
    },

    setRegister: (index: number, value: number) => {
      const interpreter = get().interpreter;
      try {
        interpreter.setRegister(index, value);
        set((state) => {
          state.interpreterState = interpreter.getState();
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to set register';
        set((state) => {
          state.lastError = message;
          state.errorTimestamp = Date.now();
        });
      }
    },

    // ============================================================================
    // BREAKPOINT ACTIONS
    // ============================================================================

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

    // ============================================================================
    // UI STATE ACTIONS
    // ============================================================================

    setSelectedTab: (tab) => {
      set((state) => {
        state.selectedTab = tab;
      });
    },

    toggleBreakpointPanel: () => {
      set((state) => {
        state.showBreakpointPanel = !state.showBreakpointPanel;
      });
    },

    // ============================================================================
    // UTILITY ACTIONS
    // ============================================================================

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

    clearLogs: () => {
      set((state) => {
        state.executionLogs = [];
      });
    },

    setError: (error: string | null) => {
      set((state) => {
        state.lastError = error;
        state.errorTimestamp = error ? Date.now() : null;
      });
    },
  }))
);
