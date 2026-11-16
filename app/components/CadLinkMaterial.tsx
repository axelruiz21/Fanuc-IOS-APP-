import React from 'react';
import { Platform } from 'react-native';
import * as THREE from 'three';
import type { CadLinkId } from '../viewer/cadFrames';
import { CAD_LINK_COLORS } from '../viewer/cadFrames';
import { getStudioMaps } from '../viewer/studioMaps';

const IS_WEB = Platform.OS === 'web';
/** Orange-peel strength; the scratch layer lives in the map itself. */
const PAINT_NORMAL_SCALE = new THREE.Vector2(0.32, 0.32);
/** Web has the HDR; native has the dimmer baked factory map. */
const PAINT_ENV = IS_WEB ? 0.8 : 1.05;
const METAL_ENV = IS_WEB ? 0.95 : 1.1;

/**
 * Powder-coat FANUC yellow: dielectric, satin base with a thin clearcoat so
 * highlights are a soft sheen rather than wet plastic. Roughness comes from
 * the wear map (≈0.22–0.55) scaled by `roughness`.
 */
export function CadLinkMaterial({ id }: { id: CadLinkId }): React.ReactElement {
  const color = CAD_LINK_COLORS[id];
  const maps = getStudioMaps();

  if (id === 'base_link') {
    // Cast base, painted dark grey: matte dielectric, not chrome.
    return (
      <meshPhysicalMaterial
        color={color}
        roughnessMap={maps.paintRoughness}
        metalness={0.2}
        roughness={1.0}
        envMapIntensity={IS_WEB ? 0.6 : 0.8}
        clearcoat={0.12}
        clearcoatRoughness={0.5}
      />
    );
  }

  if (id === 'link_6') {
    // Machined flange: brushed aluminium.
    return (
      <meshPhysicalMaterial
        color={color}
        roughnessMap={maps.metalRoughness}
        metalness={0.9}
        roughness={0.85}
        envMapIntensity={METAL_ENV}
      />
    );
  }

  return (
    <meshPhysicalMaterial
      color={color}
      roughnessMap={maps.paintRoughness}
      normalMap={maps.paintNormal}
      normalScale={PAINT_NORMAL_SCALE}
      metalness={0}
      roughness={1.0}
      envMapIntensity={PAINT_ENV}
      clearcoat={0.45}
      clearcoatRoughness={0.32}
      ior={1.45}
      specularIntensity={0.75}
    />
  );
}
