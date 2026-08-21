/**
 * Factory IBL + optional web HDR. No CDN. Renderer does not solve IK.
 */
import React, { useEffect, useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { SoftShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { createFactoryEnvironmentScene } from '../viewer/factoryEnvironment';

const SHADOW_MAP = Platform.OS === 'web' ? 2048 : 1024;
const IS_WEB = Platform.OS === 'web';
const HDR_MODULE: number | null = IS_WEB
  ? require('../../assets/env/machine_shop_01_2k.hdr')
  : null;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = globalThis.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function arrayBufferFromUri(uri: string): Promise<ArrayBuffer> {
  try {
    const res = await fetch(uri);
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch {
    // file:// fallback
  }
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(b64);
}

function bakeFactory(gl: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(gl);
  const { scene: room, dispose } = createFactoryEnvironmentScene();
  const envMap = pmrem.fromScene(room, 0.04).texture;
  dispose();
  pmrem.dispose();
  return envMap;
}

export function StudioEnvironment(): null {
  const { gl, scene } = useThree();

  useLayoutEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = IS_WEB ? 0.98 : 1.04;
    if (IS_WEB) {
      RectAreaLightUniformsLib.init();
    }
    const factoryMap = bakeFactory(gl);
    const previous = scene.environment;
    scene.environment = factoryMap;
    scene.background = new THREE.Color('#0A0908');
    return () => {
      scene.environment = previous;
      factoryMap.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    if (!IS_WEB || HDR_MODULE == null) {
      return;
    }
    let cancelled = false;
    let hdrEnv: THREE.Texture | null = null;
    (async () => {
      try {
        const asset = Asset.fromModule(HDR_MODULE);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (!uri) {
          throw new Error('HDR URI missing');
        }
        const texData = new RGBELoader().parse(await arrayBufferFromUri(uri));
        const parsed = new THREE.DataTexture(
          texData.data,
          texData.width,
          texData.height,
          THREE.RGBAFormat,
          texData.type
        );
        parsed.colorSpace = THREE.LinearSRGBColorSpace;
        parsed.minFilter = THREE.LinearFilter;
        parsed.magFilter = THREE.LinearFilter;
        parsed.generateMipmaps = false;
        parsed.flipY = true;
        parsed.needsUpdate = true;
        let pmrem: THREE.PMREMGenerator | null = null;
        try {
          pmrem = new THREE.PMREMGenerator(gl);
          hdrEnv = pmrem.fromEquirectangular(parsed).texture;
        } finally {
          parsed.dispose();
          pmrem?.dispose();
        }
        if (cancelled) {
          hdrEnv.dispose();
          hdrEnv = null;
          return;
        }
        const old = scene.environment;
        scene.environment = hdrEnv;
        if (old && old !== hdrEnv) {
          old.dispose();
        }
      } catch (error) {
        console.warn('HDR IBL failed; keeping factory IBL', error);
      }
    })();
    return () => {
      cancelled = true;
      if (hdrEnv) {
        hdrEnv.dispose();
      }
    };
  }, [gl, scene]);

  return null;
}

export function StudioLights(): React.ReactElement {
  return (
    <>
      {IS_WEB ? <SoftShadows samples={12} size={18} focus={0.42} /> : null}
      <hemisphereLight args={['#8FA0B0', '#1A1612', IS_WEB ? 0.12 : 0.28]} />
      <directionalLight
        castShadow
        position={[2.8, 5.6, 2.1]}
        intensity={IS_WEB ? 1.2 : 1.55}
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
      <directionalLight
        position={[-3.4, 1.8, -1.6]}
        intensity={IS_WEB ? 0.18 : 0.32}
        color="#A9B7C6"
      />
      {IS_WEB ? (
        <>
          <rectAreaLight
            position={[-0.85, 2.68, -0.9]}
            rotation={[-Math.PI / 2, 0, 0]}
            width={1.2}
            height={0.12}
            intensity={2.4}
            color="#FFF4DC"
          />
          <rectAreaLight
            position={[0.95, 2.68, 0.35]}
            rotation={[-Math.PI / 2, 0, 0]}
            width={1.2}
            height={0.12}
            intensity={2.0}
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
