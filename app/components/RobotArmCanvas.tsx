/**
 * LR Mate 200iD viewer. Driven by IK joints; does not solve IK.
 * CAD STLs when they load; cylinders otherwise. Platform Canvas from FiberCanvas.
 */
import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { HOME_JOINTS, type CartesianPose, type Joints } from '../kinematics';
import { DEFAULT_CAMERA_POSITION, DEFAULT_ORBIT } from '../viewer/orbit';
import { CadArm } from './CadArm';
import { Canvas } from './FiberCanvas';
import { OrbitCapture } from './OrbitCapture';
import { OrbitDriver } from './OrbitDriver';

export type Position = CartesianPose;

export interface RobotArmProps {
  joints: Joints;
  currentPosition?: CartesianPose | null;
}

const RobotScene: React.FC<RobotArmProps> = ({ joints, currentPosition }) => {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 2]} intensity={0.9} />
      <directionalLight position={[-2, 1, -1]} intensity={0.25} />
      <gridHelper args={[2, 20]} />
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <CadArm joints={joints} currentPosition={currentPosition} />
        <axesHelper args={[0.25]} />
      </group>
    </>
  );
};

export const RobotArmViewer: React.FC<RobotArmProps> = ({
  joints = HOME_JOINTS,
  currentPosition = null,
}) => {
  const orbitRef = useRef(DEFAULT_ORBIT);
  return (
    <View style={styles.wrap} accessibilityLabel="Robot arm 3D viewport">
      <OrbitCapture orbitRef={orbitRef}>
        <Canvas
          camera={{ position: [...DEFAULT_CAMERA_POSITION], fov: 45, near: 0.05, far: 20 }}
          style={styles.canvas}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <OrbitDriver orbitRef={orbitRef} />
          <RobotScene joints={joints} currentPosition={currentPosition} />
        </Canvas>
      </OrbitCapture>
    </View>
  );
};

export default RobotArmViewer;

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    minHeight: 240,
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#1a1a1a',
  },
});
