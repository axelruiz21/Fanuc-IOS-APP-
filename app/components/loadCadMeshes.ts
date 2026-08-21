/**
 * Isolated STL asset module. CadArm loads this dynamically so a Metro parse
 * failure of a .stl file cannot take down the 3D canvas.
 */
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { mergeVertices, toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAD_LINK_IDS, type CadLinkId } from '../viewer/cadFrames';
import { CAD_CREASE_RAD, applyBoxUVs } from '../viewer/stlShading';

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
  const parsed = new STLLoader().parse(await arrayBufferFromUri(uri));
  const indexed = mergeVertices(parsed, 1e-4);
  parsed.dispose();
  const creased = toCreasedNormals(indexed, CAD_CREASE_RAD);
  if (creased !== indexed) {
    indexed.dispose();
  }
  applyBoxUVs(creased, 3.2);
  creased.computeBoundingSphere();
  return creased;
}

export async function loadCadGeometries(): Promise<Record<CadLinkId, THREE.BufferGeometry>> {
  const entries = await Promise.all(
    CAD_LINK_IDS.map(async (id) => [id, await loadGeometry(MESH_MODULES[id])] as const)
  );
  return Object.fromEntries(entries) as Record<CadLinkId, THREE.BufferGeometry>;
}
