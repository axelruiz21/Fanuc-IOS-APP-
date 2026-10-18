/** 4x4 row-major homogeneous transforms. Vectors are columns: p' = T p. */

export type Vec3 = [number, number, number];
export type Mat4 = [
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
  [number, number, number, number],
];

export function identity(): Mat4 {
  return [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const r = identity();
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      r[i][j] =
        a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j] + a[i][3] * b[3][j];
    }
  }
  return r;
}

export function translate(x: number, y: number, z: number): Mat4 {
  return [
    [1, 0, 0, x],
    [0, 1, 0, y],
    [0, 0, 1, z],
    [0, 0, 0, 1],
  ];
}

/** Rodrigues rotation about a unit axis through the origin. */
export function rotateAxis(axis: Vec3, angle: number): Mat4 {
  const [ux, uy, uz] = normalize(axis);
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const r00 = t * ux * ux + c;
  const r01 = t * ux * uy - s * uz;
  const r02 = t * ux * uz + s * uy;
  const r10 = t * ux * uy + s * uz;
  const r11 = t * uy * uy + c;
  const r12 = t * uy * uz - s * ux;
  const r20 = t * ux * uz - s * uy;
  const r21 = t * uy * uz + s * ux;
  const r22 = t * uz * uz + c;
  return [
    [r00, r01, r02, 0],
    [r10, r11, r12, 0],
    [r20, r21, r22, 0],
    [0, 0, 0, 1],
  ];
}

export function normalize(v: Vec3): Vec3 {
  const n = Math.hypot(v[0], v[1], v[2]);
  if (n === 0) {
    return [0, 0, 0];
  }
  return [v[0] / n, v[1] / n, v[2] / n];
}

/** R = Rz(rz) * Ry(ry) * Rx(rx), angles in radians. */
export function rpyToMatrix(rx: number, ry: number, rz: number): Mat4 {
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);
  return [
    [cy * cz, sx * sy * cz - cx * sz, cx * sy * cz + sx * sz, 0],
    [cy * sz, sx * sy * sz + cx * cz, cx * sy * sz - sx * cz, 0],
    [-sy, sx * cy, cx * cy, 0],
    [0, 0, 0, 1],
  ];
}

/**
 * Inverse of rpyToMatrix. Gimbal lock (|ry| ~ 90°) sets rz = 0 and folds the
 * remaining freedom into rx.
 */
export function matrixToRpy(T: Mat4): Vec3 {
  const r00 = T[0][0];
  const r10 = T[1][0];
  const r20 = T[2][0];
  const r21 = T[2][1];
  const r22 = T[2][2];
  const sy = -r20;
  if (Math.abs(sy) < 0.999999) {
    const ry = Math.asin(clamp(sy, -1, 1));
    const rx = Math.atan2(r21, r22);
    const rz = Math.atan2(r10, r00);
    return [rx, ry, rz];
  }
  const ry = sy > 0 ? Math.PI / 2 : -Math.PI / 2;
  const rz = 0;
  const rx = Math.atan2(T[0][1], T[1][1]);
  return [rx, ry, rz];
}

export function translationOf(T: Mat4): Vec3 {
  return [T[0][3], T[1][3], T[2][3]];
}

export function rotationTranspose(T: Mat4): Mat4 {
  return [
    [T[0][0], T[1][0], T[2][0], 0],
    [T[0][1], T[1][1], T[2][1], 0],
    [T[0][2], T[1][2], T[2][2], 0],
    [0, 0, 0, 1],
  ];
}

/** R_a^T * R_b as a 4x4 with zero translation. */
export function relativeRotation(a: Mat4, b: Mat4): Mat4 {
  return multiply(rotationTranspose(a), [
    [b[0][0], b[0][1], b[0][2], 0],
    [b[1][0], b[1][1], b[1][2], 0],
    [b[2][0], b[2][1], b[2][2], 0],
    [0, 0, 0, 1],
  ]);
}

export function wrapPi(a: number): number {
  const twoPi = Math.PI * 2;
  let x = a % twoPi;
  if (x <= -Math.PI) {
    x += twoPi;
  }
  if (x > Math.PI) {
    x -= twoPi;
  }
  return x;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export const DEG = 180 / Math.PI;
export const RAD = Math.PI / 180;
