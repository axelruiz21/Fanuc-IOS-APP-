/**
 * Visible factory bay and cell dressing. World Y-up. Does not pose the arm
 * or solve IK. Layout numbers live in viewer/cellLayout.ts (headless, tested).
 */
import React, { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { ContactShadows, MeshReflectorMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { getStudioMaps } from '../viewer/studioMaps';
import {
  BASE_CONNECTOR,
  BEAM_LENGTH,
  BEAM_SECTION,
  BEAM_Y,
  BOLLARDS,
  BOLLARD_HEIGHT,
  BOLLARD_RADIUS,
  CABINET,
  CABLE_RADIUS,
  FENCE_HEIGHT,
  FENCE_MESH_PITCH,
  FENCE_PANEL_BOTTOM,
  FENCE_POST_SIZE,
  FIXTURE_X,
  FIXTURE_Y,
  OVERHEAD_Z,
  TABLE_PARTS,
  TABLE_PART_HEIGHT,
  TABLE_PART_RADIUS,
  TABLE_TOP_Y,
  TOTE,
  cableWaypoints,
  fenceLayout,
} from '../viewer/cellLayout';
import { theme } from '../theme';

const IS_WEB = Platform.OS === 'web';

const SAFETY_YELLOW = '#D9A614';
const GUARD_BLACK = '#161616';
const STEEL_DARK = '#2A2B2E';
// Graphite posts so the guarding does not compete with the robot's yellow.
const POST_GRAPHITE = '#2A2A2A';
// Machined slugs: satin aluminium, kept below bloom threshold.
const ALU = { color: '#B9BDC1', metalness: 0.85, roughness: 0.4, envMapIntensity: 0.55 } as const;

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
      {/* hanger rods up to the beam */}
      {[-0.55, 0.55].map((x) => (
        <mesh key={`rod-${x}`} position={[x, (BEAM_Y - FIXTURE_Y) / 2, 0]}>
          <cylinderGeometry args={[0.006, 0.006, BEAM_Y - FIXTURE_Y, 8]} />
          <meshStandardMaterial color="#1A1A1A" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

function Overhead(): React.ReactElement {
  return (
    <>
      {OVERHEAD_Z.map((z, i) => (
        <group key={`overhead-${z}`}>
          <mesh position={[0, BEAM_Y, z]} receiveShadow>
            <boxGeometry args={[BEAM_LENGTH, BEAM_SECTION, BEAM_SECTION]} />
            <meshStandardMaterial color={STEEL_DARK} metalness={0.6} roughness={0.5} envMapIntensity={0.6} />
          </mesh>
          <Fixture position={[FIXTURE_X[i] ?? 0, FIXTURE_Y, z]} />
        </group>
      ))}
    </>
  );
}

function Table(): React.ReactElement {
  return (
    <group position={[0.58, 0, 0.22]}>
      <mesh position={[0, TABLE_TOP_Y, 0]} castShadow receiveShadow>
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
      <mesh position={[0.04, TABLE_TOP_Y + 0.045, -0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.07, 0.05, 0.07]} />
        <meshPhysicalMaterial {...ALU} />
      </mesh>
      {TABLE_PARTS.map((p) => (
        <mesh key={p.join(',')} position={p} castShadow receiveShadow>
          <cylinderGeometry args={[TABLE_PART_RADIUS, TABLE_PART_RADIUS, TABLE_PART_HEIGHT, 24]} />
          <meshPhysicalMaterial {...ALU} />
        </mesh>
      ))}
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

function Fence(): React.ReactElement {
  const { posts, panels } = useMemo(fenceLayout, []);
  const maps = getStudioMaps();
  const panelHeight = FENCE_HEIGHT - FENCE_PANEL_BOTTOM;
  const bay = panels[0]?.length ?? FENCE_POST_SIZE;
  useMemo(() => {
    maps.fenceMesh.repeat.set(bay / FENCE_MESH_PITCH, panelHeight / FENCE_MESH_PITCH);
  }, [maps, bay, panelHeight]);

  return (
    <group>
      {posts.map((p, i) => (
        <mesh key={`post-${i}`} position={[p[0], FENCE_HEIGHT / 2, p[2]]} castShadow receiveShadow>
          <boxGeometry args={[FENCE_POST_SIZE, FENCE_HEIGHT, FENCE_POST_SIZE]} />
          <meshStandardMaterial color={POST_GRAPHITE} roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
      {panels.map((panel, i) => (
        <group key={`panel-${i}`} position={panel.center} rotation={[0, panel.rotationY, 0]}>
          <mesh receiveShadow>
            <planeGeometry args={[panel.length, panelHeight]} />
            <meshStandardMaterial
              color={GUARD_BLACK}
              roughness={0.5}
              metalness={0.7}
              alphaMap={maps.fenceMesh}
              alphaTest={0.35}
              side={THREE.DoubleSide}
            />
          </mesh>
          {[panelHeight / 2, -panelHeight / 2].map((y) => (
            <mesh key={`rail-${y}`} position={[0, y, 0]} castShadow>
              <boxGeometry args={[panel.length, 0.03, 0.03]} />
              <meshStandardMaterial color={SAFETY_YELLOW} roughness={0.55} metalness={0.1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Cabinet(): React.ReactElement {
  const { position, size, rotationY } = CABINET;
  const leds = ['#3DCF6E', theme.accent, theme.accent];
  return (
    <group position={[position[0], 0, position[2]]} rotation={[0, rotationY, 0]}>
      <mesh position={[0, size[1] / 2 + 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#2E3033" metalness={0.55} roughness={0.42} envMapIntensity={0.8} />
      </mesh>
      <mesh position={[0, size[1] / 2 + 0.02, size[2] / 2 + 0.006]} castShadow>
        <boxGeometry args={[size[0] - 0.06, size[1] - 0.12, 0.012]} />
        <meshStandardMaterial color="#393C40" metalness={0.5} roughness={0.38} envMapIntensity={0.8} />
      </mesh>
      {leds.map((c, i) => (
        <mesh
          key={`led-${i}`}
          position={[-size[0] / 2 + 0.07 + i * 0.04, size[1] - 0.07, size[2] / 2 + 0.014]}
        >
          <boxGeometry args={[0.014, 0.014, 0.004]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={2.4} roughness={0.3} />
        </mesh>
      ))}
      {[
        [-0.2, -0.17],
        [0.2, -0.17],
        [-0.2, 0.17],
        [0.2, 0.17],
      ].map(([x, z]) => (
        <mesh key={`foot-${x},${z}`} position={[x, 0.01, z]}>
          <cylinderGeometry args={[0.02, 0.02, 0.02, 12]} />
          <meshStandardMaterial color="#1A1A1A" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Cable(): React.ReactElement {
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      cableWaypoints().map((p) => new THREE.Vector3(p[0], p[1], p[2])),
      false,
      'catmullrom',
      0.5
    );
    return new THREE.TubeGeometry(curve, 80, CABLE_RADIUS, 10, false);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <>
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#141414" roughness={0.62} metalness={0.05} />
      </mesh>
      <mesh position={BASE_CONNECTOR.position} castShadow>
        <boxGeometry args={BASE_CONNECTOR.size} />
        <meshStandardMaterial color="#2A2A2A" metalness={0.6} roughness={0.45} />
      </mesh>
    </>
  );
}

function Bollard({ position }: { position: [number, number, number] }): React.ReactElement {
  return (
    <group position={position}>
      <mesh position={[0, BOLLARD_HEIGHT / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[BOLLARD_RADIUS, BOLLARD_RADIUS, BOLLARD_HEIGHT, 24]} />
        <meshStandardMaterial color={SAFETY_YELLOW} roughness={0.5} metalness={0.08} />
      </mesh>
      {[0.22, 0.52].map((y) => (
        <mesh key={`band-${y}`} position={[0, y, 0]}>
          <cylinderGeometry args={[BOLLARD_RADIUS + 0.002, BOLLARD_RADIUS + 0.002, 0.1, 24]} />
          <meshStandardMaterial color={GUARD_BLACK} roughness={0.55} />
        </mesh>
      ))}
      <mesh position={[0, BOLLARD_HEIGHT, 0]} castShadow>
        <sphereGeometry args={[BOLLARD_RADIUS, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={SAFETY_YELLOW} roughness={0.5} metalness={0.08} />
      </mesh>
    </group>
  );
}

function Tote(): React.ReactElement {
  return (
    <mesh position={TOTE.position} castShadow receiveShadow>
      <boxGeometry args={TOTE.size} />
      <meshStandardMaterial color="#23405F" roughness={0.62} metalness={0.02} />
    </mesh>
  );
}

/**
 * Sealed epoxy on web: blurred planar reflection modulated by the concrete
 * roughness map, so the tape reflects sharper than the field. Native keeps a
 * plain PBR floor (no second scene render).
 */
function FactoryFloor(): React.ReactElement {
  const maps = getStudioMaps();
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
      <planeGeometry args={[8, 8]} />
      {IS_WEB ? (
        <MeshReflectorMaterial
          map={maps.floorAlbedo}
          roughnessMap={maps.floorRoughness}
          roughness={1}
          metalness={0.12}
          envMapIntensity={0.5}
          mirror={0.25}
          mixBlur={1.1}
          mixStrength={1.1}
          mixContrast={1.05}
          blur={[480, 160]}
          resolution={512}
          minDepthThreshold={0.5}
          maxDepthThreshold={1.5}
          depthScale={1}
          depthToBlurRatioBias={0.25}
        />
      ) : (
        <meshStandardMaterial
          map={maps.floorAlbedo}
          roughnessMap={maps.floorRoughness}
          roughness={1}
          metalness={0.18}
          envMapIntensity={0.55}
        />
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
      <Tote />
      <Cable />
      <Cabinet />
      <Fence />
      {BOLLARDS.map((p) => (
        <Bollard key={p.join(',')} position={p} />
      ))}
      <Wall position={[0, 1.55, -2.72]} size={[5.6, 3.1, 0.08]} />
      <Wall position={[-2.72, 1.55, 0]} size={[0.08, 3.1, 5.6]} />
      <Overhead />
      <ContactShadows
        position={[0, 0.004, 0]}
        opacity={IS_WEB ? 0.45 : 0.52}
        scale={6}
        blur={2.2}
        far={2.6}
        resolution={512}
        color="#000000"
      />
      <fog attach="fog" args={[theme.bg, 7.5, 18]} />
    </>
  );
}
