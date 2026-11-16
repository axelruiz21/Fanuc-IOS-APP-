import * as THREE from 'three';
import {
  brushedMetalRoughness,
  concreteAlbedo,
  concreteRoughness,
  paintNormal,
  paintRoughness,
  wireMeshAlpha,
} from './proceduralMaps';

const FLOOR_SIZE = 512;
const PAINT_SIZE = 256;
const MESH_SIZE = 16;

export type StudioMaps = {
  floorAlbedo: THREE.DataTexture;
  floorRoughness: THREE.DataTexture;
  paintNormal: THREE.DataTexture;
  paintRoughness: THREE.DataTexture;
  metalRoughness: THREE.DataTexture;
  fenceMesh: THREE.DataTexture;
};

function dataTexture(data: Uint8Array, size: number, srgb: boolean): THREE.DataTexture {
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 8;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  return tex;
}

let cache: StudioMaps | null = null;

export function getStudioMaps(): StudioMaps {
  if (!cache) {
    cache = {
      floorAlbedo: dataTexture(concreteAlbedo(FLOOR_SIZE), FLOOR_SIZE, true),
      floorRoughness: dataTexture(concreteRoughness(FLOOR_SIZE), FLOOR_SIZE, false),
      paintNormal: dataTexture(paintNormal(PAINT_SIZE), PAINT_SIZE, false),
      paintRoughness: dataTexture(paintRoughness(PAINT_SIZE), PAINT_SIZE, false),
      metalRoughness: dataTexture(brushedMetalRoughness(PAINT_SIZE), PAINT_SIZE, false),
      fenceMesh: dataTexture(wireMeshAlpha(MESH_SIZE, 3), MESH_SIZE, false),
    };
    cache.floorAlbedo.repeat.set(1, 1);
    cache.floorRoughness.repeat.set(1, 1);
    cache.paintNormal.repeat.set(4, 4);
    cache.paintRoughness.repeat.set(4, 4);
    cache.metalRoughness.repeat.set(6, 6);
    // Fence repeat is set per panel in WorkCell from the bay size and wire pitch.
  }
  return cache;
}
