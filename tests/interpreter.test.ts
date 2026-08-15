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
