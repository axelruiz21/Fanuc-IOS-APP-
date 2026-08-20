/**
 * ROS-Industrial LR Mate 200iD visual STLs posed by jointTransforms.
 * Falls back to PrimitiveArm if a mesh fails to load. Does not solve IK.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { CartesianPose, Joints } from '../kinematics';
import {
  CAD_LINK_COLORS,
  CAD_LINK_IDS,
  cadLinkTransform,
  mat4ToThreeSetArgs,
  type CadLinkId,
} from '../viewer/cadFrames';
import { PrimitiveArm } from './PrimitiveArm';

const MESH_MODULES: Record<CadLinkId, number> = {
  base_link: require('../../assets/lrmate200id/visual/base_link.stl'),
  link_1: require('../../assets/lrmate200id/visual/link_1.stl'),
  link_2: require('../../assets/lrmate200id/visual/link_2.stl'),
  link_3: require('../../assets/lrmate200id/visual/link_3.stl'),
  link_4: require('../../assets/lrmate200id/visual/link_4.stl'),
  link_5: require('../../assets/lrmate200id/visual/link_5.stl'),
  link_6: require('../../assets/lrmate200id/visual/link_6.stl'),
};

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
    // Native file:// URIs sometimes reject fetch; read via Expo.
  }
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(b64);
}

async function loadGeometry(moduleId: number): Promise<THREE.BufferGeometry> {
  const asset = Asset.fromModule(moduleId);
  await asset.downloadAsync();
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error('CAD mesh URI missing');
  }
  const geom = new STLLoader().parse(await arrayBufferFromUri(uri));
  geom.computeVertexNormals();
  return geom;
}

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
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial
        color={CAD_LINK_COLORS[id]}
        metalness={0.28}
        roughness={0.52}
      />
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
        const entries = await Promise.all(
          CAD_LINK_IDS.map(async (id) => {
            const geometry = await loadGeometry(MESH_MODULES[id]);
            if (cancelled) {
              geometry.dispose();
              throw new Error('cad-load-cancelled');
            }
            loaded.push(geometry);
            return [id, geometry] as const;
          })
        );
        if (cancelled) {
          return;
        }
        setGeometries(Object.fromEntries(entries) as Record<CadLinkId, THREE.BufferGeometry>);
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
          <sphereGeometry args={[0.02, 10, 10]} />
          <meshStandardMaterial color="#F4F1EC" emissive="#C5A572" emissiveIntensity={0.25} />
        </mesh>
      )}
    </>
  );
};
