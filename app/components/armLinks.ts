import { forwardFrames, type Joints } from '../kinematics';

/** Base plus each URDF frame origin in millimetres. Shared by web and native 3D. */
export function armOriginsMm(joints: Joints): [number, number, number][] {
  const frames = forwardFrames(joints);
  return [[0, 0, 0], ...frames.map((frame) => frame.originMm)];
}
