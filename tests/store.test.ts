const mockMemory = new Map<string, string>();

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (k: string, v: string) => {
    mockMemory.set(k, v);
  }),
  getItem: jest.fn(async (k: string) => mockMemory.get(k) ?? null),
  removeItem: jest.fn(async (k: string) => {
    mockMemory.delete(k);
  }),
}));

import { useAppStore } from '../app/store';
import { saveState, loadState } from '../app/store/persistence';

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

describe('persistence', () => {
  beforeEach(() => {
    mockMemory.clear();
    useAppStore.getState().reset();
  });

  it('round-trips program through saveState/loadState', async () => {
    mockMemory.clear();
    useAppStore.getState().setProgram('MOVE P[1]\nEND');
    await saveState();
    const loaded = await loadState();
    expect(loaded?.program).toContain('MOVE P[1]');
  });
});
