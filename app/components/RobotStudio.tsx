/**
 * In-memory studio IBL + lights + floor. No CDN HDR. Renderer does not solve IK.
 */
import React, { useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { ContactShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { theme } from '../theme';

const SHADOW_MAP = Platform.OS === 'web' ? 2048 : 1024;

export function StudioEnvironment(): null {
  const { gl, scene } = useThree();

  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const envMap = pmrem.fromScene(room, 0.04).texture;
    room.dispose();
    const previous = scene.environment;
    scene.environment = envMap;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.12;
    return () => {
      scene.environment = previous;
      envMap.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}

export function StudioLights(): React.ReactElement {
  return (
    <>
      <hemisphereLight args={['#A8B4C0', '#1C1612', 0.42]} />
      <directionalLight
        castShadow
        position={[3.1, 5.4, 2.6]}
        intensity={1.45}
        color="#FFF4E6"
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-bias={-0.00018}
        shadow-normalBias={0.022}
        shadow-camera-near={0.4}
        shadow-camera-far={16}
        shadow-camera-left={-1.8}
        shadow-camera-right={1.8}
        shadow-camera-top={1.8}
        shadow-camera-bottom={-1.8}
      />
      <directionalLight position={[-2.8, 1.4, -2.2]} intensity={0.28} color="#C5A572" />
      <spotLight
        position={[-0.2, 4.2, 0.6]}
        intensity={0.55}
        color="#F4F1EC"
        angle={0.55}
        penumbra={0.85}
        distance={12}
      />
    </>
  );
}

export function StudioGround(): React.ReactElement {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.003, 0]} receiveShadow>
        <circleGeometry args={[3.4, 80]} />
        <meshStandardMaterial
          color="#12110F"
          metalness={0.18}
          roughness={0.62}
          envMapIntensity={0.55}
        />
      </mesh>
      <ContactShadows
        position={[0, 0.001, 0]}
        opacity={0.48}
        scale={5.5}
        blur={2.6}
        far={2.4}
        color="#000000"
      />
      <fog attach="fog" args={[theme.bg, 5.5, 14]} />
    </>
  );
}
