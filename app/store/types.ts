/**
 * State Management Types
 * Phase 3: Zustand Store Type Definitions
 */

import { FANUCInterpreter, InterpreterState, ExecutionResult, Position } from '../utils/interpreter';

/**
 * Complete application state
 */
export interface AppState {
  // Program Editor
  program: string;
  programHistory: string[];
  historyIndex: number;

  // Interpreter State
  interpreter: FANUCInterpreter;
  interpreterState: InterpreterState;
  executionResult: ExecutionResult | null;

  // Execution Control
  isRunning: boolean;
  isPaused: boolean;
  executionLogs: string[];

  // UI State
  selectedTab: 'editor' | 'io' | 'console' | '3d';
  breakpointLines: Set<number>;
  showBreakpointPanel: boolean;

  // Error State
  lastError: string | null;
  errorTimestamp: number | null;
}

/**
 * Store Actions
 */
export interface AppActions {
  // Program Management
  setProgram: (program: string) => void;
  appendProgram: (text: string) => void;
  clearProgram: () => void;
  undo: () => void;
  redo: () => void;

  // Execution Control
  runProgram: () => Promise<void>;
  pauseExecution: () => void;
  resumeExecution: () => Promise<void>;
  stepExecution: () => Promise<void>;
  resetExecution: () => void;

  // Interpreter Control
  definePosition: (index: number, position: Position) => void;
  setDigitalInput: (index: number, value: boolean) => void;
  setRegister: (index: number, value: number) => void;

  // Breakpoints
  addBreakpoint: (lineNumber: number) => void;
  removeBreakpoint: (lineNumber: number) => void;
  clearBreakpoints: () => void;

  // UI State
  setSelectedTab: (tab: 'editor' | 'io' | 'console' | '3d') => void;
  toggleBreakpointPanel: () => void;

  // State Reset
  reset: () => void;
  clearLogs: () => void;
  setError: (error: string | null) => void;
}

/**
 * Combined store interface
 */
export interface AppStore extends AppState, AppActions {}

/**
 * Persistence schema for AsyncStorage
 */
export interface PersistedState {
  program: string;
  positions: Record<number, Position>;
  breakpointLines: number[];
}
