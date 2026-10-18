/**
 * Native resolution for `import './RobotArm'`. Metro loads expo-gl via
 * `@react-three/fiber/native` (see FiberCanvas.native.tsx). Same joints as web.
 */
export { RobotArmViewer, default } from './RobotArmCanvas';
export type { RobotArmProps, Position } from './RobotArmCanvas';
