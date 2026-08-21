/**
 * Visible factory bay. World Y-up. Does not pose the arm or solve IK.
 */
import React from 'react';
import { Platform } from 'react-native';
import { ContactShadows, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { getStudioMaps } from '../viewer/studioMaps';
import { theme } from '../theme';

const IS_WEB = Platform.OS === 'web';

function Wall({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}): React.ReactElement {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#3A3934" roughness={0.92} metalness={0.04} envMapIntensity={0.35} />
    </mesh>
  );
}

function Fixture({ position }: { position: [number, number, number] }): React.ReactElement {
  return (
    <group position={position}>
      <mesh>
        <boxGeometry args={[1.35, 0.04, 0.16]} />
        <meshStandardMaterial color="#1A1A1A" metalness={0.7} roughness={0.38} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <boxGeometry args={[1.28, 0.015, 0.1]} />
        <meshStandardMaterial
          color="#FFF6E4"
          emissive="#FFF1D2"
          emissiveIntensity={3.4}
          roughness={0.35}
          metalness={0}
        />
      </mesh>
    </group>
  );
}

function Table(): React.ReactElement {
  const topY = 0.36;
  return (
    <group position={[0.58, 0, 0.22]}>
      <mesh position={[0, topY, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.04, 0.32]} />
        <meshStandardMaterial color="#4A4E52" metalness={0.72} roughness={0.38} envMapIntensity={0.9} />
      </mesh>
      {[
        [-0.2, 0.17, -0.13],
        [0.2, 0.17, -0.13],
        [-0.2, 0.17, 0.13],
        [0.2, 0.17, 0.13],
      ].map((p) => (
        <mesh key={p.join(',')} position={p as [number, number, number]} castShadow>
          <boxGeometry args={[0.028, 0.34, 0.028]} />
          <meshStandardMaterial color="#2C2C2C" metalness={0.55} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0.04, topY + 0.045, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 0.05, 0.07]} />
        <meshPhysicalMaterial
          color="#C9CDD1"
          metalness={0.92}
          roughness={0.22}
          envMapIntensity={1.15}
        />
      </mesh>
    </group>
  );
}

function Pedestal(): React.ReactElement {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.5, 0.02, 0.5]} />
        <meshStandardMaterial color="#2F3236" metalness={0.82} roughness={0.32} envMapIntensity={1} />
      </mesh>
      {(
        [
          [-0.2, 0.024, -0.2],
          [0.2, 0.024, -0.2],
          [-0.2, 0.024, 0.2],
          [0.2, 0.024, 0.2],
        ] as Array<[number, number, number]>
      ).map((p) => (
        <mesh key={p.join(',')} position={p} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.01, 12]} />
          <meshStandardMaterial color="#1A1A1A" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function FactoryFloor(): React.ReactElement {
  const maps = getStudioMaps();
  const common = {
    map: maps.floorAlbedo,
    roughnessMap: maps.floorRoughness,
    roughness: 1,
    metalness: 0.18,
    envMapIntensity: 0.55,
  };

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[8, 8]} />
      {IS_WEB ? (
        <MeshReflectorMaterial
          {...common}
          mirror={0.12}
          blur={[280, 80]}
          resolution={512}
          mixBlur={0.65}
          mixStrength={1.35}
          depthScale={0.85}
          minDepthThreshold={0.35}
          maxDepthThreshold={1.25}
          reflectorOffset={0.02}
        />
      ) : (
        <meshStandardMaterial {...common} />
      )}
    </mesh>
  );
}

function BayShell(): React.ReactElement {
  return (
    <mesh position={[0, 2.4, 0]}>
      <boxGeometry args={[14, 8, 14]} />
      <meshStandardMaterial
        color="#12110E"
        side={THREE.BackSide}
        roughness={1}
        metalness={0}
        envMapIntensity={0.2}
      />
    </mesh>
  );
}

export function WorkCell(): React.ReactElement {
  return (
    <>
      <BayShell />
      <FactoryFloor />
      <Pedestal />
      <Table />
      <Wall position={[0, 1.55, -2.72]} size={[5.6, 3.1, 0.08]} />
      <Wall position={[-2.72, 1.55, 0]} size={[0.08, 3.1, 5.6]} />
      <Fixture position={[-0.85, 2.72, -0.9]} />
      <Fixture position={[0.95, 2.72, 0.35]} />
      <Fixture position={[0.1, 2.72, -0.15]} />
      {IS_WEB ? null : (
        <ContactShadows
          position={[0, 0.002, 0]}
          opacity={0.52}
          scale={6}
          blur={2.4}
          far={2.8}
          color="#000000"
        />
      )}
      <fog attach="fog" args={[theme.bg, 7.5, 18]} />
    </>
  );
}
