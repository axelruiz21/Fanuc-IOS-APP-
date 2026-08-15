import { CHAIN, type CartesianPose, type Joints } from './lrmate200id';
import {
  DEG,
  identity,
  matrixToRpy,
  multiply,
  rotateAxis,
  translate,
  translationOf,
  type Mat4,
} from './math';

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
