import {
  A1,
  A2,
  A3,
  CHAIN,
  D1,
  D3,
  D6,
  WRIST_SINGULAR_RAD,
  withinLimits,
  type CartesianPose,
  type Joints,
} from './lrmate200id';
import {
  DEG,
  RAD,
  clamp,
  identity,
  matrixToRpy,
  multiply,
  relativeRotation,
  rotateAxis,
  rpyToMatrix,
  translate,
  translationOf,
  wrapPi,
  type Mat4,
  type Vec3,
} from './math';

export type IkFailureReason = 'unreachable' | 'singular' | 'joint_limit';

export type IkResult =
  | { ok: true; joints: Joints }
  | { ok: false; reason: IkFailureReason };

export interface JointFrame {
  /** Link origin in millimetres. */
  originMm: [number, number, number];
  transform: Mat4;
}

export function jointTransforms(joints: Joints): Mat4[] {
  let T = identity();
  const frames: Mat4[] = [];
  for (let i = 0; i < CHAIN.length; i++) {
    const { origin, axis } = CHAIN[i];
    T = multiply(T, translate(origin[0], origin[1], origin[2]));
    T = multiply(T, rotateAxis(axis, joints[i]));
    frames.push(T);
  }
  return frames;
}

export function forwardFrames(joints: Joints): JointFrame[] {
  return jointTransforms(joints).map((transform) => {
    const p = translationOf(transform);
    return {
      originMm: [p[0] * 1000, p[1] * 1000, p[2] * 1000],
      transform,
    };
  });
}

export function forward(joints: Joints): CartesianPose {
  const frames = jointTransforms(joints);
  const T = frames[frames.length - 1];
  const p = translationOf(T);
  const [rx, ry, rz] = matrixToRpy(T);
  return {
    x: p[0] * 1000,
    y: p[1] * 1000,
    z: p[2] * 1000,
    rx: rx * DEG,
    ry: ry * DEG,
    rz: rz * DEG,
  };
}

function asJoints(q: number[]): Joints {
  return [q[0], q[1], q[2], q[3], q[4], q[5]];
}

function seedDistance(q: Joints, seed: Joints): number {
  let sum = 0;
  for (let i = 0; i < 6; i++) {
    const d = wrapPi(q[i] - seed[i]);
    sum += d * d;
  }
  return sum;
}

function wristCenter(target: CartesianPose): { wrist: Vec3; rotation: Mat4 } {
  const rotation = rpyToMatrix(target.rx * RAD, target.ry * RAD, target.rz * RAD);
  const tool: Vec3 = [target.x / 1000, target.y / 1000, target.z / 1000];
  const xAxis: Vec3 = [rotation[0][0], rotation[1][0], rotation[2][0]];
  const wrist: Vec3 = [
    tool[0] - D6 * xAxis[0],
    tool[1] - D6 * xAxis[1],
    tool[2] - D6 * xAxis[2],
  ];
  return { wrist, rotation };
}

function armRotation(q1: number, q2: number, q3: number): Mat4 {
  return multiply(rotateAxis([0, 0, 1], q1), rotateAxis([0, 1, 0], q2 - q3));
}

function wristJoints(Rw: Mat4): Array<[number, number, number]> {
  const r00 = Rw[0][0];
  const r01 = Rw[0][1];
  const r02 = Rw[0][2];
  const r10 = Rw[1][0];
  const r20 = Rw[2][0];
  const s5abs = Math.max(Math.hypot(r10, r20), Math.hypot(r01, r02));
  if (s5abs < 1e-8) {
    return [];
  }

  const out: Array<[number, number, number]> = [];
  for (const s5p of [s5abs, -s5abs]) {
    const q5p = Math.atan2(s5p, r00);
    const q4p = Math.atan2(r10 / s5p, -r20 / s5p);
    const q6p = Math.atan2(r01 / s5p, r02 / s5p);
    out.push([wrapPi(-q4p), wrapPi(-q5p), wrapPi(-q6p)]);
  }
  return out;
}

/**
 * Analytic Pieper IK for the spherical-wrist LR Mate 200iD chain.
 * Wrist center = flange origin minus D6 along tool X (first column of R).
 */
export function inverse(target: CartesianPose, seed: Joints): IkResult {
  const { wrist, rotation } = wristCenter(target);
  const [wx, wy, wz] = wrist;
  const r = Math.hypot(wx, wy);

  const q1Options: number[] = [];
  if (r < 1e-9) {
    q1Options.push(wrapPi(seed[0]), wrapPi(seed[0] + Math.PI));
  } else {
    const q1a = Math.atan2(wy, wx);
    q1Options.push(wrapPi(q1a), wrapPi(q1a + Math.PI));
  }

  const amp = Math.hypot(D3, A3);
  const psi = Math.atan2(A3, D3);
  const candidates: Joints[] = [];
  let hadGeometric = false;
  let hadNonSingular = false;

  for (const q1 of q1Options) {
    const c1 = Math.cos(q1);
    const s1 = Math.sin(q1);
    const L = wx * c1 + wy * s1;
    const Lx = L - A1;
    const Lz = wz - D1;
    const rho2 = Lx * Lx + Lz * Lz;
    const C = (rho2 - A2 * A2 - D3 * D3 - A3 * A3) / (2 * A2);
    if (Math.abs(C) > amp + 1e-9) {
      continue;
    }
    const cosDelta = clamp(C / amp, -1, 1);
    const delta = Math.acos(cosDelta);
    const q3Options = [wrapPi(psi + delta), wrapPi(psi - delta)];

    for (const q3 of q3Options) {
      const A = A2 + D3 * Math.cos(q3) + A3 * Math.sin(q3);
      const B = -D3 * Math.sin(q3) + A3 * Math.cos(q3);
      const denom = A * A + B * B;
      if (denom < 1e-16) {
        continue;
      }
      const q2 = Math.atan2((A * Lx - B * Lz) / denom, (B * Lx + A * Lz) / denom);
      const T3 = armRotation(q1, q2, q3);
      const Rw = relativeRotation(T3, rotation);
      const wrists = wristJoints(Rw);
      if (wrists.length === 0) {
        hadGeometric = true;
        continue;
      }
      for (const [q4, q5, q6] of wrists) {
        hadGeometric = true;
        if (Math.abs(q5) < WRIST_SINGULAR_RAD) {
          continue;
        }
        hadNonSingular = true;
        const q = asJoints([q1, q2, q3, q4, q5, q6]);
        if (!withinLimits(q)) {
          continue;
        }
        candidates.push(q);
      }
    }
  }

  if (candidates.length > 0) {
    let best = candidates[0];
    let bestDist = seedDistance(best, seed);
    for (let i = 1; i < candidates.length; i++) {
      const dist = seedDistance(candidates[i], seed);
      if (dist < bestDist) {
        best = candidates[i];
        bestDist = dist;
      }
    }
    return { ok: true, joints: best };
  }
  if (!hadGeometric) {
    return { ok: false, reason: 'unreachable' };
  }
  if (!hadNonSingular) {
    return { ok: false, reason: 'singular' };
  }
  return { ok: false, reason: 'joint_limit' };
}
