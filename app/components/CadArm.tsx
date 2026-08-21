/**
 * ROS-Industrial LR Mate 200iD visual STLs posed by jointTransforms.
 * Falls back to PrimitiveArm if a mesh fails to load. Does not solve IK.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CartesianPose, Joints } from '../kinematics';
import {
  CAD_LINK_IDS,
  cadLinkTransform,
  mat4ToThreeSetArgs,
  type CadLinkId,
} from '../viewer/cadFrames';
import { CadLinkMaterial } from './CadLinkMaterial';
import { PrimitiveArm } from './PrimitiveArm';

const CadLinkMesh: React.FC<{
  id: CadLinkId;
  joints: Joints;
  geometry: THREE.BufferGeometry;
}> = ({ id, joints, geometry }) => {
  const ref = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) {
      return;
    }
    mesh.matrixAutoUpdate = false;
    mesh.matrix.set(...mat4ToThreeSetArgs(cadLinkTransform(joints, id)));
    mesh.matrixWorldNeedsUpdate = true;
  }, [id, joints]);

  return (
    <mesh ref={ref} geometry={geometry} castShadow receiveShadow>
      <CadLinkMaterial id={id} />
    </mesh>
  );
};

export const CadArm: React.FC<{
  joints: Joints;
  currentPosition?: CartesianPose | null;
}> = ({ joints, currentPosition }) => {
  const [geometries, setGeometries] = useState<Record<CadLinkId, THREE.BufferGeometry> | null>(
    null
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loaded: THREE.BufferGeometry[] = [];
    (async () => {
      try {
        const { loadCadGeometries } = await import('./loadCadMeshes');
        const next = await loadCadGeometries();
        if (cancelled) {
          Object.values(next).forEach((geometry) => geometry.dispose());
          return;
        }
        loaded.push(...Object.values(next));
        setGeometries(next);
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.warn('CAD meshes failed to load; using cylinder arm', error);
        loaded.forEach((geometry) => geometry.dispose());
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      loaded.forEach((geometry) => geometry.dispose());
    };
  }, []);

  if (failed || !geometries) {
    return <PrimitiveArm joints={joints} currentPosition={currentPosition} />;
  }

  return (
    <>
      {CAD_LINK_IDS.map((id) => (
        <CadLinkMesh key={id} id={id} joints={joints} geometry={geometries[id]} />
      ))}
      {currentPosition && (
        <mesh
          position={[
            currentPosition.x / 1000,
            currentPosition.y / 1000,
            currentPosition.z / 1000,
          ]}
        >
          <sphereGeometry args={[0.016, 16, 16]} />
          <meshStandardMaterial color="#C5A572" metalness={0.35} roughness={0.4} />
        </mesh>
      )}
    </>
  );
};
