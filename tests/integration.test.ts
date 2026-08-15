import { FANUCInterpreter } from '../app/utils/interpreter';
import { useAppStore } from '../app/store';

describe('default lesson program', () => {
  it('runs MOVE / DOUT / WAIT / MOVE through the interpreter', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0 });
    vm.definePosition(2, { x: 150, y: 250, z: 350, rx: 45, ry: 0, rz: 0 });
    const result = await vm.execute(`MOVE P[1]
DOUT OT[1]=ON
WAIT 0.05
MOVE P[2]
DOUT OT[1]=OFF
END`);
    expect(result.success).toBe(true);
    expect(result.state.currentPosition?.x).toBe(150);
    expect(result.state.io.DO[1]).toBe(false);
  });

  it('runs the same program through the store', async () => {
    useAppStore.getState().reset();
    useAppStore.getState().setProgram(`MOVE P[1]
DOUT OT[1]=ON
WAIT 0.05
MOVE P[2]
DOUT OT[1]=OFF
END`);
    await useAppStore.getState().runProgram();
    const s = useAppStore.getState();
    expect(s.lastError).toBeNull();
    expect(s.interpreterState.currentPosition?.x).toBe(150);
  });
});

describe('IF conditions', () => {
  it('turns on output when register condition is true', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute(`PR[1]=75
IF (PR[1]>50)
  DOUT OT[1]=ON
ENDIF
END`);
    expect(result.success).toBe(true);
    expect(result.state.registers.PR[1]).toBe(75);
    expect(result.state.io.DO[1]).toBe(true);
  });

  it('turns on output when digital input is on', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 100, y: 100, z: 100, rx: 0, ry: 0, rz: 0 });
    vm.setDigitalInput(1, true);
    const result = await vm.execute(`MOVE P[1]
IF (DI[1]=ON)
  DOUT OT[1]=ON
ENDIF
END`);
    expect(result.success).toBe(true);
    expect(result.state.io.DI[1]).toBe(true);
    expect(result.state.io.DO[1]).toBe(true);
  });
});

describe('register arithmetic', () => {
  it('evaluates assignment and arithmetic expressions', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute(`PR[1]=50
PR[2]=30
PR[3]=PR[1]+PR[2]
PR[4]=PR[1]-10
PR[5]=PR[1]*2
END`);
    expect(result.success).toBe(true);
    expect(result.state.registers.PR[1]).toBe(50);
    expect(result.state.registers.PR[3]).toBe(80);
    expect(result.state.registers.PR[4]).toBe(40);
    expect(result.state.registers.PR[5]).toBe(100);
  });
});

describe('error handling', () => {
  it('fails on invalid position reference', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute(`MOVE P[999]
END`);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});
