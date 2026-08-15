/**
 * Native resolution for `import './RobotArm'`. Must not pull Three / R3F /
 * expo-gl; App mounts Viewport3D on iOS instead.
 */
import type { CartesianPose, Joints } from '../kinematics';

export type Position = CartesianPose;

export interface RobotArmProps {
  joints: Joints;
  currentPosition?: CartesianPose | null;
}

export function RobotArmViewer(props: RobotArmProps): null {
  void props;
  return null;
}

export default RobotArmViewer;
