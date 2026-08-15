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
