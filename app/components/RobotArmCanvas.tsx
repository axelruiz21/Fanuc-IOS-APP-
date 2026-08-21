/**
 * LR Mate 200iD viewer. Driven by IK joints; does not solve IK.
 * CAD STLs when they load; cylinders otherwise. Platform Canvas from FiberCanvas.
 */
import React, { lazy, Suspense, useLayoutEffect, useRef } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import * as THREE from 'three';
import { HOME_JOINTS, type CartesianPose, type Joints } from '../kinematics';
import { DEFAULT_CAMERA_POSITION, DEFAULT_ORBIT } from '../viewer/orbit';
import { cadLinkTransform, mat4ToThreeSetArgs } from '../viewer/cadFrames';
import { theme } from '../theme';
import { CadArm } from './CadArm';
import { Canvas } from './FiberCanvas';
import { OrbitCapture } from './OrbitCapture';
import { OrbitDriver } from './OrbitDriver';
import { StudioEnvironment, StudioLights } from './RobotStudio';
import { WorkCell } from './WorkCell';

function DisabledEffects(): null {
  return null;
}

const RobotEffects = lazy(() =>
  import('./RobotEffects')
    .then((mod) => ({ default: mod.RobotEffects }))
    .catch((error: unknown) => {
      console.warn('RobotEffects failed to load; continuing without post', error);
      return { default: DisabledEffects };
    })
);

export type Position = CartesianPose;

export interface RobotArmProps {
  joints: Joints;
  currentPosition?: CartesianPose | null;
}

const EOAT_AXIS_LEN = 0.1;
const EOAT_AXIS_RAD = 0.0055;

const AxisShaft: React.FC<{ color: string; rotation: [number, number, number] }> = ({
  color,
  rotation,
}) => (
  <group rotation={rotation}>
    <mesh position={[0, EOAT_AXIS_LEN / 2, 0]} castShadow={false}>
      <cylinderGeometry args={[EOAT_AXIS_RAD, EOAT_AXIS_RAD, EOAT_AXIS_LEN, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.55}
        roughness={0.42}
        metalness={0.18}
      />
    </mesh>
  </group>
);

/** RGB triad at link_6 / flange (end-of-arm tooling). */
const EoatAxes: React.FC<{ joints: Joints }> = ({ joints }) => {
  const ref = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) {
      return;
    }
    group.matrixAutoUpdate = false;
    group.matrix.set(...mat4ToThreeSetArgs(cadLinkTransform(joints, 'link_6')));
    group.matrixWorldNeedsUpdate = true;
  }, [joints]);

  return (
    <group ref={ref}>
      <AxisShaft color="#E24B4B" rotation={[0, 0, -Math.PI / 2]} />
      <AxisShaft color="#3DCF6E" rotation={[0, 0, 0]} />
      <AxisShaft color="#4B8FE2" rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
};

const RobotScene: React.FC<RobotArmProps> = ({ joints, currentPosition }) => {
  return (
    <>
      <color attach="background" args={['#0A0908']} />
      <StudioEnvironment />
      <StudioLights />
      <WorkCell />
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <CadArm joints={joints} currentPosition={currentPosition} />
        <EoatAxes joints={joints} />
      </group>
      <Suspense fallback={null}>
        <RobotEffects />
      </Suspense>
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
          shadows
          camera={{ position: [...DEFAULT_CAMERA_POSITION], fov: 38, near: 0.05, far: 28 }}
          style={styles.canvas}
          dpr={Platform.OS === 'web' ? [1, 2] : [1, 1.5]}
          gl={{
            antialias: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.04,
            outputColorSpace: THREE.SRGBColorSpace,
            powerPreference: 'high-performance',
          }}
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
    backgroundColor: theme.bg,
    minHeight: 220,
  },
  canvas: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: theme.bg,
  },
});
