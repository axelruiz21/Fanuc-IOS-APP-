import { OrbitControls } from '@react-three/drei';
import type { MutableRefObject } from 'react';
import {
  DEFAULT_ORBIT_TARGET,
  ORBIT_MAX_RADIUS,
  ORBIT_MIN_RADIUS,
  type OrbitState,
} from '../viewer/orbit';

/** Web orbit: damped drei controls with the same target and radius clamps as native math. */
export function OrbitDriver({ orbitRef }: { orbitRef: MutableRefObject<OrbitState> }) {
  void orbitRef;
  return (
    <OrbitControls
      makeDefault
      target={DEFAULT_ORBIT_TARGET}
      enableDamping
      dampingFactor={0.08}
      minDistance={ORBIT_MIN_RADIUS}
      maxDistance={ORBIT_MAX_RADIUS}
      enablePan
      screenSpacePanning
      rotateSpeed={0.7}
      zoomSpeed={0.85}
      panSpeed={0.6}
      minPolarAngle={0.08}
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  );
}
