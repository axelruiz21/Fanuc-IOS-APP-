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
import { saveState, loadState, applyPersistedState } from '../app/store/persistence';

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

  it('resetExecution preserves seeded positions and breakpoints', () => {
    useAppStore.getState().addBreakpoint(3);
    useAppStore.getState().resetExecution();

    const s = useAppStore.getState();
    expect(s.interpreterState.positions[1].x).toBe(100);
    expect(s.interpreterState.positions[10].x).toBe(2000);
    expect(s.breakpointLines).toContain(3);
    expect(s.interpreter.getState().breakPoints.has(3)).toBe(true);
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

  it('does not let origin P[n] in storage wipe seeded P[10]', async () => {
    useAppStore.getState().reset();
    expect(useAppStore.getState().interpreterState.positions[10].x).toBe(2000);

    applyPersistedState({
      program: 'MOVE P[10]\nEND',
      positions: {
        1: { x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0 },
        10: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
      },
      breakpointLines: [],
    });

    expect(useAppStore.getState().interpreterState.positions[10].x).toBe(2000);
    expect(useAppStore.getState().program).toContain('MOVE P[10]');
  });
});
