/**
 * Persistence Hooks
 * Phase 3: State Persistence with AsyncStorage
 * Save/load program and breakpoints
 */

import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from './index';
import { PersistedState } from './types';
import type { Position } from '../utils/interpreter';

const STORAGE_KEY = 'fanuc-mvp-state';

export function shouldPersistSnapshot(
  prev: { program: string; breakpointLines: number[]; interpreterState: { positions: unknown } },
  next: { program: string; breakpointLines: number[]; interpreterState: { positions: unknown } }
): boolean {
  return (
    prev.program !== next.program ||
    prev.breakpointLines !== next.breakpointLines ||
    prev.interpreterState.positions !== next.interpreterState.positions
  );
}

export function isUnsetPosition(p: Position): boolean {
  return p.x === 0 && p.y === 0 && p.z === 0 && p.rx === 0 && p.ry === 0 && p.rz === 0;
}

export function taughtPositions(
  positions: Record<number, Position>
): Record<number, Position> {
  const taught: Record<number, Position> = {};
  for (const [key, position] of Object.entries(positions)) {
    if (!isUnsetPosition(position)) {
      taught[Number(key)] = position;
    }
  }
  return taught;
}

export function applyPersistedState(persistedState: PersistedState): void {
  const store = useAppStore.getState();

  if (persistedState.program) {
    store.setProgram(persistedState.program);
  }

  if (persistedState.positions) {
    Object.entries(persistedState.positions).forEach(([indexStr, position]) => {
      if (isUnsetPosition(position)) {
        return;
      }
      const index = parseInt(indexStr, 10);
      if (!isNaN(index)) {
        store.definePosition(index, position);
      }
    });
  }

  if (persistedState.breakpointLines) {
    persistedState.breakpointLines.forEach((line) => {
      store.addBreakpoint(line);
    });
  }
}

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
      positions: taughtPositions(state.interpreterState.positions),
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
        applyPersistedState(persistedState);
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
      if (!shouldPersistSnapshot(prev, state)) {
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
