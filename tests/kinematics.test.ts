import {
  A3,
  D3,
  forward,
  HOME_JOINTS,
  inverse,
  wrapPi,
  type Joints,
} from '../app/kinematics';

function tipErrorMm(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

function jointDistance(a: Joints, b: Joints): number {
  return a.reduce((sum, qi, i) => sum + wrapPi(qi - b[i]) ** 2, 0);
}

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

describe('inverse kinematics', () => {
  const samples: Joints[] = [
    [0.2, 0.4, 0.3, 0.1, 0.8, 0.2],
    [-0.5, 0.7, 1.0, -0.4, 1.1, 0.6],
    [0.8, -0.3, 0.5, 1.2, -0.9, -1.5],
    [1.2, 1.0, 2.0, 0.3, 0.6, 2.0],
    [0.1, 0.5, 3.3, 0.2, 0.9, 0.1],
  ];

  it.each(samples.map((q) => [q]))('round-trips joints %j', (q: Joints) => {
    const pose = forward(q);
    const result = inverse(pose, q);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(jointDistance(result.joints, q)).toBeLessThan(1e-3 ** 2 * 6 + 1e-6);
    for (let i = 0; i < 6; i++) {
      expect(Math.abs(wrapPi(result.joints[i] - q[i]))).toBeLessThan(1e-3);
    }
    expect(tipErrorMm(forward(result.joints), pose)).toBeLessThan(1);
  });

  it('keeps tip error under 1 mm for a reachable seed-home solve', () => {
    const q: Joints = [0.1, 0.5, 0.4, 0.2, 0.7, 0.3];
    const pose = forward(q);
    const result = inverse(pose, HOME_JOINTS);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(tipErrorMm(forward(result.joints), pose)).toBeLessThan(1);
  });

  it('rejects a point beyond the work envelope as unreachable', () => {
    const result = inverse(
      { x: 2000, y: 0, z: 0, rx: 180, ry: 0, rz: 0 },
      HOME_JOINTS
    );
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe('unreachable');
  });

  it('treats a wrist-singular pose as singular', () => {
    // Unique-elbow (q3 = atan2(a3, d3)) with J5 = 0: no non-singular alternate.
    const q: Joints = [0, 1.2, Math.atan2(A3, D3), 0, 0, 0];
    const pose = forward(q);
    const result = inverse(pose, HOME_JOINTS);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe('singular');
  });

  it('does not return a wrist-singular configuration on success', () => {
    const pose = forward([0, 0.4, 0.2, 0.3, 0, 0.5]);
    const result = inverse(pose, HOME_JOINTS);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(Math.abs(result.joints[4])).toBeGreaterThanOrEqual(1e-3);
    expect(tipErrorMm(forward(result.joints), pose)).toBeLessThan(1);
  });

  it('reaches the lesson P[1]/P[2] seeds from home', () => {
    const p1 = inverse({ x: 100, y: 200, z: 300, rx: 0, ry: 0, rz: 0 }, HOME_JOINTS);
    const p2 = inverse({ x: 150, y: 250, z: 350, rx: 45, ry: 0, rz: 0 }, HOME_JOINTS);
    expect(p1.ok).toBe(true);
    expect(p2.ok).toBe(true);
  });

  it('reports joint_limit when the wrist is in reach but no solution fits limits', () => {
    // Flange at the J2 origin with rz=180: geometrically in the annulus, no in-limit wrist.
    const result = inverse({ x: 80, y: 0, z: 330, rx: 0, ry: 0, rz: 180 }, HOME_JOINTS);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.reason).toBe('joint_limit');
  });
});
