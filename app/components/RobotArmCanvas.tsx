/**
 * LR Mate 200iD 6-link viewer. Driven by IK joints; does not solve IK.
 * Platform-suffix-free so RobotArm.web.tsx can re-export without a Metro cycle.
 */
import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { forwardFrames, HOME_JOINTS, type CartesianPose, type Joints } from '../kinematics';

export type Position = CartesianPose;

export interface RobotArmProps {
  joints: Joints;
  currentPosition?: CartesianPose | null;
}

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
    <mesh position={position} quaternion={quaternion}>
      <cylinderGeometry args={[radius, radius, length, 14]} />
      <meshStandardMaterial color={color} metalness={0.35} roughness={0.45} />
    </mesh>
  );
};

const ArmModel: React.FC<{ joints: Joints; currentPosition?: CartesianPose | null }> = ({
  joints,
  currentPosition,
}) => {
  const origins = useMemo(() => {
    const frames = forwardFrames(joints);
    return [[0, 0, 0] as [number, number, number], ...frames.map((f) => f.originMm)];
  }, [joints]);

  const points = origins.map(mmToM);
  const tip = points[points.length - 1];

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
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
        <mesh key={`joint-${i}`} position={p}>
          <sphereGeometry args={[i === 0 ? 0.032 : 0.022, 12, 12]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {tip && (
        <mesh position={tip}>
          <sphereGeometry args={[0.028, 14, 14]} />
          <meshStandardMaterial color="#43a047" metalness={0.5} roughness={0.3} />
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
          <sphereGeometry args={[0.02, 10, 10]} />
          <meshStandardMaterial color="#29b6f6" emissive="#1565c0" emissiveIntensity={0.4} />
        </mesh>
      )}
      <axesHelper args={[0.25]} />
    </group>
  );
};

const RobotScene: React.FC<RobotArmProps> = ({ joints, currentPosition }) => {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 2]} intensity={0.9} />
      <directionalLight position={[-2, 1, -1]} intensity={0.25} />
      <gridHelper args={[2, 20]} />
      <ArmModel joints={joints} currentPosition={currentPosition} />
      <OrbitControls enableDamping={false} />
    </>
  );
};

export const RobotArmViewer: React.FC<RobotArmProps> = ({
  joints = HOME_JOINTS,
  currentPosition = null,
}) => {
  return (
    <Canvas
      camera={{ position: [1.5, 1.1, 1.5], fov: 45, near: 0.05, far: 20 }}
      style={{ width: '100%', height: '100%', backgroundColor: '#1a1a1a' }}
      dpr={[1, 2]}
      gl={{ antialias: true }}
    >
      <RobotScene joints={joints} currentPosition={currentPosition} />
    </Canvas>
  );
};

export default RobotArmViewer;
