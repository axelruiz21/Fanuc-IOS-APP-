/**
 * RobotArm Component
 * Phase 4: 3D Robot Arm Rendering with react-three-fiber
 * Simple 4-link robot arm (5 cylinders: base + 4 joints)
 */

import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export interface Position {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

export interface RobotArmProps {
  position?: Position | null;
  animated?: boolean;
}

/**
 * Joint component: a cylinder representing a robot joint/link
 */
const RobotLink: React.FC<{
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
  radius: number;
  color: string;
}> = ({ position, rotation, length, radius, color }) => {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 16]} />
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.6} />
    </mesh>
  );
};

/**
 * Coordinate axes helper
 */
const CoordinateAxes: React.FC = () => {
  return (
    <group>
      {/* X axis (red) */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 100, 0, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#ff0000" linewidth={2} />
      </line>

      {/* Y axis (green) */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, 100, 0])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#00ff00" linewidth={2} />
      </line>

      {/* Z axis (blue) */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([0, 0, 0, 0, 0, 100])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#0000ff" linewidth={2} />
      </line>
    </group>
  );
};

/**
 * Main robot arm 3D model
 */
const RobotArmModel: React.FC<{ position?: Position | null }> = ({ position }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Convert position to rotations for 4-link arm
  // Simplified forward kinematics
  const calculateJointAngles = (pos?: Position) => {
    if (!pos) {
      return {
        theta1: 0,
        theta2: 0,
        theta3: 0,
        theta4: 0,
      };
    }

    // Simple inverse kinematics approximation
    // Map position to joint angles
    const distance = Math.sqrt(pos.x ** 2 + pos.y ** 2);
    const theta1 = Math.atan2(pos.y, pos.x);
    const theta2 = Math.atan2(pos.z, distance) * 0.5;
    const theta3 = (pos.rx * Math.PI) / 180 * 0.3;
    const theta4 = (pos.rz * Math.PI) / 180;

    return { theta1, theta2, theta3, theta4 };
  };

  const angles = calculateJointAngles(position);

  // Link lengths (mm, scaled down for visualization)
  const link1Length = 50; // Base link
  const link2Length = 80; // Upper arm
  const link3Length = 70; // Forearm
  const link4Length = 40; // End effector

  const linkRadius = 4;

  return (
    <group ref={groupRef}>
      {/* Base (static) */}
      <RobotLink
        position={[0, link1Length / 2, 0]}
        rotation={[0, 0, 0]}
        length={link1Length}
        radius={linkRadius + 2}
        color="#333333"
      />

      {/* Link 1 - rotates around Y axis */}
      <group rotation={[0, angles.theta1, 0]}>
        <RobotLink
          position={[0, link1Length + link2Length / 2, 0]}
          rotation={[0, 0, 0]}
          length={link2Length}
          radius={linkRadius}
          color="#e53935"
        />

        {/* Link 2 - rotates around local Z axis */}
        <group position={[0, link1Length + link2Length, 0]} rotation={[angles.theta2, 0, 0]}>
          <RobotLink
            position={[0, link3Length / 2, 0]}
            rotation={[0, 0, 0]}
            length={link3Length}
            radius={linkRadius}
            color="#fb8c00"
          />

          {/* Link 3 - rotates around local Z axis */}
          <group position={[0, link3Length, 0]} rotation={[angles.theta3, 0, 0]}>
            <RobotLink
              position={[0, link4Length / 2, 0]}
              rotation={[0, 0, 0]}
              length={link4Length}
              radius={linkRadius}
              color="#fdd835"
            />

            {/* End effector */}
            <mesh position={[0, link4Length, 0]}>
              <sphereGeometry args={[linkRadius * 1.5, 16, 16]} />
              <meshStandardMaterial color="#4caf50" roughness={0.3} metalness={0.8} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Coordinate axes at origin */}
      <CoordinateAxes />

      {/* Target position indicator */}
      {position && (
        <mesh position={[position.x / 10, position.y / 10, position.z / 10]}>
          <sphereGeometry args={[3, 8, 8]} />
          <meshStandardMaterial color="#2196f3" emissive="#2196f3" />
        </mesh>
      )}
    </group>
  );
};

/**
 * Scene with lights and controls
 */
const RobotScene: React.FC<{ position?: Position | null }> = ({ position }) => {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(150, 150, 150);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[100, 100, 100]} intensity={0.8} />
      <directionalLight position={[-100, -100, -100]} intensity={0.3} />
      <pointLight position={[0, 200, 0]} intensity={0.4} />

      {/* Camera */}
      <PerspectiveCamera makeDefault position={[150, 150, 150]} fov={50} />

      {/* Controls */}
      <OrbitControls 
        autoRotate={false}
        autoRotateSpeed={2}
      />

      {/* Ground grid */}
      <gridHelper args={[400, 20]} position={[0, 0, 0]} />

      {/* Robot arm */}
      <RobotArmModel position={position} />
    </>
  );
};

/**
 * Main Viewport3D component with Three.js canvas
 */
export const RobotArmViewer: React.FC<RobotArmProps> = ({
  position,
  animated = true,
}) => {
  return (
    <Canvas
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: '#1a1a1a',
      }}
      dpr={[1, 2]}
      shadows
    >
      <RobotScene position={position} />
    </Canvas>
  );
};

export default RobotArmViewer;
