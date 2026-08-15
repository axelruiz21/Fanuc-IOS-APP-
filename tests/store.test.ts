import { useAppStore } from '../app/store';

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
