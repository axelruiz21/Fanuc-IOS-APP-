import type { Vec3 } from './math';

/** J1..J6 in radians. */
export type Joints = [number, number, number, number, number, number];

/** Flange pose: millimetres and XYZ-Euler RPY degrees (not FANUC WPR). */
export interface CartesianPose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface JointSpec {
  origin: Vec3;
  axis: Vec3;
  min: number;
  max: number;
}

/** ROS-Industrial LR Mate 200iD serial chain (meters), spec table. */
export const CHAIN: readonly JointSpec[] = [
  { origin: [0, 0, 0.33], axis: [0, 0, 1], min: -2.96706, max: 2.96706 },
  { origin: [0.05, 0, 0], axis: [0, 1, 0], min: -1.74533, max: 2.53073 },
  { origin: [0, 0, 0.33], axis: [0, -1, 0], min: -1.22173, max: 3.57792 },
  { origin: [0, 0, 0.035], axis: [-1, 0, 0], min: -3.31613, max: 3.31613 },
  { origin: [0.335, 0, 0], axis: [0, -1, 0], min: -2.18166, max: 2.18166 },
  { origin: [0.08, 0, 0], axis: [-1, 0, 0], min: -6.28319, max: 6.28319 },
];

export const HOME_JOINTS: Joints = [0, 0, 0, 0, 0, 0];

export const D1 = 0.33;
export const A1 = 0.05;
export const A2 = 0.33;
export const D3 = 0.035;
export const A3 = 0.335;
export const D6 = 0.08;

export const WRIST_SINGULAR_RAD = 1e-3;

export function withinLimits(q: Joints): boolean {
  return CHAIN.every((joint, i) => q[i] >= joint.min && q[i] <= joint.max);
}
