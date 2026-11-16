/**
 * Factory IBL + optional web HDR, and the one light rig for the cell.
 * No CDN. Renderer does not solve IK.
 */
import React, {
  Component,
  useEffect,
  useLayoutEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { SoftShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { createFactoryEnvironmentScene } from '../viewer/factoryEnvironment';
import { FIXTURE_X, FIXTURE_Y, OVERHEAD_Z } from '../viewer/cellLayout';

const SHADOW_MAP = Platform.OS === 'web' ? 2048 : 1024;
const IS_WEB = Platform.OS === 'web';

class OptionalPass extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('Optional studio pass disabled', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}

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
    // Web tone-maps in the composer; this exposure is what native sees.
    gl.toneMappingExposure = IS_WEB ? 0.92 : 1.0;
    const previous = scene.environment;
    let factoryMap: THREE.Texture | null = null;
    try {
      factoryMap = bakeFactory(gl);
      scene.environment = factoryMap;
    } catch (error) {
      console.warn('Factory IBL failed; continuing without environment map', error);
    }
    return () => {
      scene.environment = previous;
      factoryMap?.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    if (!IS_WEB) {
      return;
    }
    let cancelled = false;
    let hdrEnv: THREE.Texture | null = null;
    (async () => {
      try {
        const { machineShopHdrModule } = await import('./loadMachineShopHdr');
        const asset = Asset.fromModule(machineShopHdrModule());
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

/**
 * One rig, three jobs. Key: warm, high, camera-left and in front, the only
 * shadow caster (two casters wash each other out) — placed so the arm's shadow
 * falls camera-right onto open floor instead of hiding behind the base. Rim:
 * cool from behind-right so the yellow separates from the dark bay. Pool: a spot from the fixture over
 * the pedestal so the floor has falloff instead of a flat tint. The IBL
 * (HDR on web, baked bay on native) supplies ambient; hemisphere stays tiny.
 */
export function StudioLights(): React.ReactElement {
  const [areaLights, setAreaLights] = useState(false);

  useLayoutEffect(() => {
    if (!IS_WEB) {
      return;
    }
    try {
      RectAreaLightUniformsLib.init();
      setAreaLights(true);
    } catch (error) {
      console.warn('Rect area lights unavailable', error);
    }
  }, []);

  return (
    <>
      {IS_WEB ? (
        <OptionalPass>
          <SoftShadows samples={16} size={5} focus={0.5} />
        </OptionalPass>
      ) : null}
      <hemisphereLight args={['#6E7F94', '#17130F', IS_WEB ? 0.06 : 0.22]} />
      <directionalLight
        castShadow
        position={[-1.5, 4.2, 2.4]}
        intensity={IS_WEB ? 2.3 : 1.8}
        color="#FFEBD2"
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-bias={-0.00012}
        shadow-normalBias={0.018}
        shadow-camera-near={0.5}
        shadow-camera-far={14}
        shadow-camera-left={-2.2}
        shadow-camera-right={2.2}
        shadow-camera-top={2.2}
        shadow-camera-bottom={-2.2}
      />
      <directionalLight position={[2.8, 2.6, -2.4]} intensity={IS_WEB ? 0.5 : 0.45} color="#B9C6D6" />
      <spotLight
        position={[FIXTURE_X[1], FIXTURE_Y - 0.04, OVERHEAD_Z[1]]}
        intensity={IS_WEB ? 28 : 16}
        color="#FFF1DA"
        angle={0.6}
        penumbra={0.75}
        distance={9}
        decay={2}
      />
      {IS_WEB && areaLights
        ? OVERHEAD_Z.map((z, i) => (
            <rectAreaLight
              key={`area-${z}`}
              position={[FIXTURE_X[i] ?? 0, FIXTURE_Y - 0.04, z]}
              rotation={[-Math.PI / 2, 0, 0]}
              width={1.2}
              height={0.12}
              intensity={2.6}
              color="#FFF4DC"
            />
          ))
        : null}
    </>
  );
}
