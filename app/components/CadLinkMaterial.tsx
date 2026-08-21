import React from 'react';
import type { CadLinkId } from '../viewer/cadFrames';
import { CAD_LINK_COLORS } from '../viewer/cadFrames';

export function CadLinkMaterial({ id }: { id: CadLinkId }): React.ReactElement {
  const color = CAD_LINK_COLORS[id];
  if (id === 'base_link') {
    return (
      <meshPhysicalMaterial
        color={color}
        metalness={0.78}
        roughness={0.34}
        envMapIntensity={1.2}
        clearcoat={0.22}
        clearcoatRoughness={0.42}
      />
    );
  }
  if (id === 'link_6') {
    return (
      <meshPhysicalMaterial
        color={color}
        metalness={0.62}
        roughness={0.38}
        envMapIntensity={0.95}
        clearcoat={0.12}
        clearcoatRoughness={0.55}
      />
    );
  }
  return (
    <meshPhysicalMaterial
      color={color}
      metalness={0.06}
      roughness={0.28}
      envMapIntensity={1.08}
      clearcoat={0.72}
      clearcoatRoughness={0.16}
      sheen={0.18}
      sheenColor="#E8C04A"
    />
  );
}
