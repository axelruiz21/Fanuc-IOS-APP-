/**
 * Custom Hooks for Store
 * Phase 3: Convenience hooks for components
 */

import { useCallback } from 'react';
import { useAppStore } from './index';

/**
 * Hook: Program management
 */
export function useProgramControls() {
  const program = useAppStore((s) => s.program);
  const setProgram = useAppStore((s) => s.setProgram);
  const appendProgram = useAppStore((s) => s.appendProgram);
  const clearProgram = useAppStore((s) => s.clearProgram);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);

  return {
    program,
    setProgram,
    appendProgram,
    clearProgram,
    undo,
    redo,
  };
}

/**
 * Hook: Execution control
 */
export function useExecutionControls() {
  const isRunning = useAppStore((s) => s.isRunning);
  const isPaused = useAppStore((s) => s.isPaused);
  const runProgram = useAppStore((s) => s.runProgram);
  const pauseExecution = useAppStore((s) => s.pauseExecution);
  const resumeExecution = useAppStore((s) => s.resumeExecution);
  const stepExecution = useAppStore((s) => s.stepExecution);
  const resetExecution = useAppStore((s) => s.resetExecution);

  return {
    isRunning,
    isPaused,
    runProgram,
    pauseExecution,
    resumeExecution,
    stepExecution,
    resetExecution,
  };
}

/**
 * Hook: Interpreter state
 */
export function useInterpreterState() {
  const interpreterState = useAppStore((s) => s.interpreterState);
  const executionResult = useAppStore((s) => s.executionResult);
  const executionLogs = useAppStore((s) => s.executionLogs);
  const lastError = useAppStore((s) => s.lastError);

  return {
    interpreterState,
    executionResult,
    executionLogs,
    lastError,
    currentPosition: interpreterState.currentPosition,
    digitalInputs: interpreterState.io.DI,
    digitalOutputs: interpreterState.io.DO,
    registers: interpreterState.registers.PR,
  };
}

/**
 * Hook: I/O control
 */
export function useIOControls() {
  const definePosition = useAppStore((s) => s.definePosition);
  const setDigitalInput = useAppStore((s) => s.setDigitalInput);
  const setRegister = useAppStore((s) => s.setRegister);

  return {
    definePosition,
    setDigitalInput,
    setRegister,
  };
}

/**
 * Hook: Breakpoint management
 */
export function useBreakpoints() {
  const breakpointLines = useAppStore((s) => s.breakpointLines);
  const addBreakpoint = useAppStore((s) => s.addBreakpoint);
  const removeBreakpoint = useAppStore((s) => s.removeBreakpoint);
  const clearBreakpoints = useAppStore((s) => s.clearBreakpoints);

  return {
    breakpointLines,
    addBreakpoint,
    removeBreakpoint,
    clearBreakpoints,
  };
}

/**
 * Hook: UI state
 */
export function useUIState() {
  const selectedTab = useAppStore((s) => s.selectedTab);
  const setSelectedTab = useAppStore((s) => s.setSelectedTab);
  const showBreakpointPanel = useAppStore((s) => s.showBreakpointPanel);
  const toggleBreakpointPanel = useAppStore((s) => s.toggleBreakpointPanel);

  return {
    selectedTab,
    setSelectedTab,
    showBreakpointPanel,
    toggleBreakpointPanel,
  };
}

/**
 * Hook: Reset and utilities
 */
export function useAppReset() {
  const reset = useAppStore((s) => s.reset);
  const clearLogs = useAppStore((s) => s.clearLogs);
  const setError = useAppStore((s) => s.setError);

  return {
    reset,
    clearLogs,
    setError,
  };
}
