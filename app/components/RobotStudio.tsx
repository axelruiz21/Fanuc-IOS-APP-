/**
 * Factory IBL + lights. No CDN HDR. Renderer does not solve IK.
 */
import React, { useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { SoftShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { createFactoryEnvironmentScene } from '../viewer/factoryEnvironment';

const SHADOW_MAP = Platform.OS === 'web' ? 2048 : 1024;
const IS_WEB = Platform.OS === 'web';

export function StudioEnvironment(): null {
  const { gl, scene } = useThree();

  useLayoutEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.04;
    if (IS_WEB) {
      RectAreaLightUniformsLib.init();
    }

    const pmrem = new THREE.PMREMGenerator(gl);
    const { scene: room, dispose } = createFactoryEnvironmentScene();
    const envMap = pmrem.fromScene(room, 0.04).texture;
    dispose();
    const previous = scene.environment;
    scene.environment = envMap;
    scene.background = new THREE.Color('#0A0908');
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
      {IS_WEB ? <SoftShadows samples={12} size={18} focus={0.42} /> : null}
      <hemisphereLight args={['#8FA0B0', '#1A1612', 0.28]} />
      <directionalLight
        castShadow
        position={[2.8, 5.6, 2.1]}
        intensity={1.55}
        color="#FFF3E0"
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-bias={-0.00016}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
      />
      <directionalLight position={[-3.4, 1.8, -1.6]} intensity={0.32} color="#A9B7C6" />
      {IS_WEB ? (
        <>
          <rectAreaLight
            position={[-0.85, 2.68, -0.9]}
            rotation={[-Math.PI / 2, 0, 0]}
            width={1.2}
            height={0.12}
            intensity={6.5}
            color="#FFF4DC"
          />
          <rectAreaLight
            position={[0.95, 2.68, 0.35]}
            rotation={[-Math.PI / 2, 0, 0]}
            width={1.2}
            height={0.12}
            intensity={5.5}
            color="#FFF4DC"
          />
        </>
      ) : (
        <spotLight
          position={[0.2, 4.0, 0.5]}
          intensity={0.7}
          color="#F4F1EC"
          angle={0.62}
          penumbra={0.8}
          distance={14}
        />
      )}
    </>
  );
}
