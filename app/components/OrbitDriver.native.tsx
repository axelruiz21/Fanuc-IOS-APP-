import { useFrame } from '@react-three/fiber';
import type { MutableRefObject } from 'react';
import { cameraPosition, type OrbitState } from '../viewer/orbit';

/** Native orbit: apply the PanResponder-updated spherical state each frame. */
export function OrbitDriver({ orbitRef }: { orbitRef: MutableRefObject<OrbitState> }) {
  useFrame(({ camera }) => {
    const state = orbitRef.current;
    const [x, y, z] = cameraPosition(state);
    camera.position.set(x, y, z);
    camera.lookAt(state.target[0], state.target[1], state.target[2]);
  });
  return null;
}
