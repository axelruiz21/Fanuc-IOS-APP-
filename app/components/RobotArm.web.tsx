/**
 * Metro resolves this file on web. Re-export the 3D canvas so web does not
 * get a 2D fallback. The implementation lives in a suffix-free module to
 * avoid a RobotArm.web ↔ RobotArm import cycle.
 */
export { RobotArmViewer, default } from './RobotArmCanvas';
export type { RobotArmProps, Position } from './RobotArmCanvas';
