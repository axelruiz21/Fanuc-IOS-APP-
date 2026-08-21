/**
 * Cylinder fallback when CAD STLs fail to load. Posed from currentJoints; no IK.
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import type { CartesianPose, Joints } from '../kinematics';
import { armOriginsMm } from './armLinks';

const LINK_COLORS = ['#5c5c5c', '#e6b800', '#4a4a4a', '#e6b800', '#4a4a4a', '#2e7d32'];

function mmToM(origin: [number, number, number]): THREE.Vector3 {
  return new THREE.Vector3(origin[0] / 1000, origin[1] / 1000, origin[2] / 1000);
}

const Bone: React.FC<{
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
  color: string;
}> = ({ start, end, radius, color }) => {
  const { length, position, quaternion } = useMemo(() => {
    const dir = end.clone().sub(start);
    const length = dir.length();
    const position = start.clone().add(end).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      length > 1e-8 ? dir.normalize() : new THREE.Vector3(0, 1, 0)
    );
    return { length, position, quaternion };
  }, [start, end]);

  if (length < 1e-6) {
    return null;
  }

  return (
    <mesh position={position} quaternion={quaternion} castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, length, 20]} />
      <meshStandardMaterial color={color} metalness={0.12} roughness={0.42} />
    </mesh>
  );
};

export const PrimitiveArm: React.FC<{
  joints: Joints;
  currentPosition?: CartesianPose | null;
}> = ({ joints, currentPosition }) => {
  const origins = useMemo(() => armOriginsMm(joints), [joints]);
  const points = origins.map(mmToM);
  const tip = points[points.length - 1];

  return (
    <>
      {points.slice(0, -1).map((start, i) => (
        <Bone
          key={`link-${i}`}
          start={start}
          end={points[i + 1]}
          radius={i === 0 ? 0.028 : 0.018}
          color={LINK_COLORS[i] ?? '#888888'}
        />
      ))}
      {points.map((p, i) => (
        <mesh key={`joint-${i}`} position={p} castShadow>
          <sphereGeometry args={[i === 0 ? 0.032 : 0.022, 16, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.35} roughness={0.45} />
        </mesh>
      ))}
      {tip && (
        <mesh position={tip}>
          <sphereGeometry args={[0.028, 14, 14]} />
          <meshStandardMaterial color="#2A2A2A" metalness={0.28} roughness={0.48} />
        </mesh>
      )}
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
