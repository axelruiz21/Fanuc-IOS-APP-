import React from 'react';
import * as THREE from 'three';
import type { CadLinkId } from '../viewer/cadFrames';
import { CAD_LINK_COLORS } from '../viewer/cadFrames';
import { getStudioMaps } from '../viewer/studioMaps';

const PAINT_NORMAL_SCALE = new THREE.Vector2(0.28, 0.28);

export function CadLinkMaterial({ id }: { id: CadLinkId }): React.ReactElement {
  const color = CAD_LINK_COLORS[id];
  const maps = getStudioMaps();

  if (id === 'base_link') {
    return (
      <meshPhysicalMaterial
        color={color}
        roughnessMap={maps.metalRoughness}
        metalness={0.86}
        roughness={0.4}
        envMapIntensity={1.15}
        clearcoat={0.18}
        clearcoatRoughness={0.45}
      />
    );
  }

  if (id === 'link_6') {
    return (
      <meshPhysicalMaterial
        color={color}
        roughnessMap={maps.metalRoughness}
        metalness={0.9}
        roughness={0.28}
        envMapIntensity={1.05}
      />
    );
  }

  return (
    <meshPhysicalMaterial
      color={color}
      roughnessMap={maps.paintRoughness}
      normalMap={maps.paintNormal}
      normalScale={PAINT_NORMAL_SCALE}
      metalness={0.08}
      roughness={0.3}
      envMapIntensity={1.15}
      clearcoat={1}
      clearcoatRoughness={0.12}
      ior={1.5}
      reflectivity={0.5}
    />
  );
}
