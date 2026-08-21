/**
 * LR Mate 200iD viewer. Driven by IK joints; does not solve IK.
 * CAD STLs when they load; cylinders otherwise. Platform Canvas from FiberCanvas.
 */
import React, {
  Component,
  lazy,
  Suspense,
  useLayoutEffect,
  useRef,
  type ErrorInfo,
  type MutableRefObject,
  type ReactNode,
} from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import * as THREE from 'three';
import { HOME_JOINTS, type CartesianPose, type Joints } from '../kinematics';
import { DEFAULT_CAMERA_POSITION, DEFAULT_ORBIT, type OrbitState } from '../viewer/orbit';
import { cadLinkTransform, mat4ToThreeSetArgs } from '../viewer/cadFrames';
import { theme } from '../theme';
import { CadArm } from './CadArm';
import { Canvas } from './FiberCanvas';
import { OrbitCapture } from './OrbitCapture';
import { OrbitDriver } from './OrbitDriver';
import { PrimitiveArm } from './PrimitiveArm';
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

class StudioExtrasBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('Studio extras disabled', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}

class ArmBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('CAD arm failed; using cylinder arm', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

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

function RobotScene({
  joints,
  currentPosition,
  orbitRef,
}: RobotArmProps & { orbitRef: MutableRefObject<OrbitState> }) {
  return (
    <>
      <color attach="background" args={['#1A1612']} />
      <hemisphereLight args={['#F4EFE6', '#3A332C', 0.7]} />
      <directionalLight position={[2.4, 5.2, 2.2]} intensity={1.7} color="#FFF6E8" castShadow />
      <StudioExtrasBoundary>
        <StudioEnvironment />
        <StudioLights />
        <WorkCell />
        <OrbitDriver orbitRef={orbitRef} />
        <Suspense fallback={null}>
          <RobotEffects />
        </Suspense>
      </StudioExtrasBoundary>
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <ArmBoundary
          fallback={<PrimitiveArm joints={joints} currentPosition={currentPosition} />}
        >
          <CadArm joints={joints} currentPosition={currentPosition} />
          <EoatAxes joints={joints} />
        </ArmBoundary>
      </group>
    </>
  );
}

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
          gl={{ antialias: true, alpha: false }}
        >
          <RobotScene joints={joints} currentPosition={currentPosition} orbitRef={orbitRef} />
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
    position: 'relative',
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.bg,
  },
});
