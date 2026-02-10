/**
 * Persistence Hooks
 * Phase 3: State Persistence with AsyncStorage
 * Save/load program and breakpoints
 */

import { useEffect } from 'react';
import { useAppStore } from './index';
import { PersistedState } from './types';

const STORAGE_KEY = 'fanuc-mvp-state';

/**
 * Save state to AsyncStorage
 */
export async function saveState(): Promise<void> {
  try {
    const state = useAppStore.getState();
    
    const persistedState: PersistedState = {
      program: state.program,
      positions: state.interpreterState.positions,
      breakpointLines: Array.from(state.breakpointLines),
    };

    // Note: In React Native, use AsyncStorage
    // For web/testing, we'll use localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
    }
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

/**
 * Load state from AsyncStorage
 */
export async function loadState(): Promise<PersistedState | null> {
  try {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as PersistedState;
      }
    }
    return null;
  } catch (err) {
    console.error('Failed to load state:', err);
    return null;
  }
}

/**
 * Hook to restore persisted state on mount
 */
export function useRestorePersistedState() {
  useEffect(() => {
    (async () => {
      const persistedState = await loadState();
      if (persistedState) {
        const store = useAppStore.getState();

        // Restore program
        if (persistedState.program) {
          store.setProgram(persistedState.program);
        }

        // Restore positions
        if (persistedState.positions) {
          Object.entries(persistedState.positions).forEach(([indexStr, position]) => {
            const index = parseInt(indexStr, 10);
            if (!isNaN(index)) {
              store.definePosition(index, position);
            }
          });
        }

        // Restore breakpoints
        if (persistedState.breakpointLines) {
          persistedState.breakpointLines.forEach((line) => {
            store.addBreakpoint(line);
          });
        }
      }
    })();
  }, []);
}

/**
 * Hook to auto-save state on changes
 */
export function useAutoSaveState(debounceMs: number = 1000) {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const unsubscribe = useAppStore.subscribe(
      (state) => state.program,
      () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          saveState();
        }, debounceMs);
      }
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [debounceMs]);
}

/**
 * Hook to clear all persisted state
 */
export async function clearPersistedState(): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('Failed to clear persisted state:', err);
  }
}
