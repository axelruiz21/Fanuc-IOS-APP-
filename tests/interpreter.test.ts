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

  it('does not throw Unknown/CALL on ENDIF', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('PR[1]=1\nENDIF\nEND');
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(result.executionLog.some((l) => l.includes('ENDIF'))).toBe(true);
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

describe('WAIT', () => {
  it('delays then continues', async () => {
    const vm = new FANUCInterpreter();
    const started = Date.now();
    const result = await vm.execute('WAIT 0.05\nDOUT OT[1]=ON\nEND');
    expect(result.success).toBe(true);
    expect(Date.now() - started).toBeGreaterThanOrEqual(45);
    expect(result.state.io.DO[1]).toBe(true);
  });

  it('WAIT DIN unblocks when input goes high', async () => {
    const vm = new FANUCInterpreter();
    const run = vm.execute('WAIT DIN(DI[1])\nDOUT OT[2]=ON\nEND');
    setTimeout(() => vm.setDigitalInput(1, true), 30);
    const result = await run;
    expect(result.success).toBe(true);
    expect(result.state.io.DO[2]).toBe(true);
  });
});

describe('FOR', () => {
  it('iterates and supports P[J]', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 10, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    vm.definePosition(2, { x: 20, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    vm.definePosition(3, { x: 30, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    const result = await vm.execute(
      'PR[2]=0\nFOR J=1 TO 3\nPR[2]=PR[2]+1\nMOVE P[J]\nENDFOR\nEND'
    );
    expect(result.success).toBe(true);
    expect(result.state.registers.PR[2]).toBe(3);
    expect(result.state.currentPosition?.x).toBe(30);
  });
});

describe('IF/ELSE', () => {
  it('runs THEN and skips ELSE when true', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute(
      'PR[1]=75\nIF (PR[1]>50)\nPR[2]=1\nELSE\nPR[2]=2\nENDIF\nEND'
    );
    expect(result.success).toBe(true);
    expect(result.state.registers.PR[2]).toBe(1);
  });

  it('runs ELSE when false', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute(
      'PR[1]=10\nIF (PR[1]>50)\nPR[2]=1\nELSE\nPR[2]=2\nENDIF\nEND'
    );
    expect(result.success).toBe(true);
    expect(result.state.registers.PR[2]).toBe(2);
  });
});

describe('step()', () => {
  it('lands on ELSE body after false IF instead of skipping past jump target', async () => {
    const vm = new FANUCInterpreter();
    vm.addBreakPoint(1); // 0-based: IF line
    const program = [
      'PR[1]=10',
      'IF (PR[1]>50)',
      'PR[2]=1',
      'ELSE',
      'PR[2]=2',
      'ENDIF',
      'END',
    ].join('\n');

    const paused = await vm.execute(program);
    expect(paused.state.isPaused).toBe(true);

    const afterIf = await vm.step();
    expect(afterIf.success).toBe(true);

    const afterElseBody = await vm.step();
    expect(afterElseBody.success).toBe(true);
    expect(vm.getRegister(2)).toBe(2);
  });
});

describe('continue() errors', () => {
  it('returns ExecutionResult on CALL failure and clears isRunning', async () => {
    const vm = new FANUCInterpreter();
    vm.addBreakPoint(0);
    const paused = await vm.execute('CALL LESSON2\nEND');
    expect(paused.state.isPaused).toBe(true);

    const resumed = await vm.continue();
    expect(resumed.success).toBe(false);
    expect(resumed.error).toMatch(/not implemented/i);
    expect(resumed.state.isRunning).toBe(false);
  });
});

describe('bounds', () => {
  it('rejects out-of-range PR assignment', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('PR[101]=5\nEND');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/PR index must be 1-100/);
  });

  it('rejects out-of-range DI in IF condition', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('IF (DI[33]=OFF)\nENDIF\nEND');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/DI index must be 1-32/);
  });
});

describe('expressions and snapshots', () => {
  it('adds two registers', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('PR[1]=50\nPR[2]=30\nPR[3]=PR[1]+PR[2]\nEND');
    expect(result.success).toBe(true);
    expect(result.state.registers.PR[3]).toBe(80);
  });

  it('preserves breakpoints in getState', () => {
    const vm = new FANUCInterpreter();
    vm.addBreakPoint(4);
    expect(vm.getState().breakPoints.has(4)).toBe(true);
  });

  it('rejects CALL as unimplemented', async () => {
    const vm = new FANUCInterpreter();
    const result = await vm.execute('CALL LESSON2\nEND');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not implemented/i);
  });

  it('reads J speed after the position ref', async () => {
    const vm = new FANUCInterpreter();
    vm.definePosition(1, { x: 1, y: 0, z: 0, rx: 0, ry: 0, rz: 0 });
    const result = await vm.execute('J P[1] 40%\nEND');
    expect(result.success).toBe(true);
    expect(result.executionLog.join('\n')).toMatch(/40%/);
  });
});
