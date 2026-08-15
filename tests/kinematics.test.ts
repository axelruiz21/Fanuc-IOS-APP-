import { forward, HOME_JOINTS } from '../app/kinematics';

describe('forward kinematics', () => {
  it('returns a finite pose at home', () => {
    const p = forward(HOME_JOINTS);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.z)).toBe(true);
  });

  it('freezes home FK as a golden pose', () => {
    const p = forward(HOME_JOINTS);
    // Printed from forward([0,0,0,0,0,0]): flange at (50+335+80, 0, 330+330+35) mm, R = I.
    expect(p.x).toBeCloseTo(465, 9);
    expect(p.y).toBeCloseTo(0, 9);
    expect(p.z).toBeCloseTo(695, 9);
    expect(p.rx).toBeCloseTo(0, 9);
    expect(p.ry).toBeCloseTo(0, 9);
    expect(p.rz).toBeCloseTo(0, 9);
  });
});
