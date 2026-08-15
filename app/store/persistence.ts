/**
 * Persistence Hooks
 * Phase 3: State Persistence with AsyncStorage
 * Save/load program and breakpoints
 */

import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from './index';
import { PersistedState } from './types';

const STORAGE_KEY = 'fanuc-mvp-state';

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

/**
 * Save state to AsyncStorage
 */
export async function saveState(): Promise<void> {
  try {
    const state = useAppStore.getState();

    const persistedState: PersistedState = {
      program: state.program,
      positions: state.interpreterState.positions,
      breakpointLines: state.breakpointLines,
    };

    await writeItem(STORAGE_KEY, JSON.stringify(persistedState));
  } catch (err) {
    console.error('Failed to save state:', err);
  }
}

/**
 * Load state from AsyncStorage
 */
export async function loadState(): Promise<PersistedState | null> {
  try {
    const data = await readItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as PersistedState;
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

    const unsubscribe = useAppStore.subscribe((state, prev) => {
      if (state.program === prev.program && state.breakpointLines === prev.breakpointLines) {
        return;
      }
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        void saveState();
      }, debounceMs);
    });

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
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  } catch (err) {
    console.error('Failed to clear persisted state:', err);
  }
}
