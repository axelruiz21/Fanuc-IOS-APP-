// tests/interpreter.test.ts
import { FANUCInterpreter } from '../app/utils/interpreter';

describe('FANUCInterpreter smoke', () => {
  it('executes MOVE P[1] to a taught position', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0 });
    const result = await vm.execute('MOVE P[1]\nEND');
    expect(result.success).toBe(true);
    expect(result.state.currentPosition?.x).toBe(100);
  });
});

describe('tokenization via public commands', () => {
  it('parses DOUT OT[1]=ON', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('DOUT OT[1]=ON\nEND');
    expect(result.success).toBe(true);
    expect(result.state.io.DO[1]).toBe(true);
  });

  it('rejects P[0]', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('MOVE P[0]\nEND');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/1-100|index/i);
  });
});

describe('run loop', () => {
  it('keeps comment lines so PC matches the editor', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 5, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    const program = `; comment\nMOVE P[1]\nEND`;
    const result = await vm.execute(program);
    expect(result.success).toBe(true);
    expect(result.executionLog.some((l) => l.includes('[1] MOVE'))).toBe(true);
  });

  it('continue after breakpoint does not restart from line 0', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 1, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    vm.definePosition(2, { x: 2, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    vm.addBreakPoint(1); // 0-based: MOVE P[2]
    const first = await vm.execute('MOVE P[1]\nMOVE P[2]\nEND');
    expect(first.state.isPaused).toBe(true);
    expect(first.state.currentPosition?.x).toBe(1);
    const resumed = await vm.continue();
    expect(resumed.success).toBe(true);
    expect(resumed.state.currentPosition?.x).toBe(2);
    expect(resumed.executionLog.some((l) => l.includes('MOVE P[1]'))).toBe(true);
  });
});
