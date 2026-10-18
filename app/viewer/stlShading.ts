import * as THREE from 'three';

/** Crease angle for ROS-Industrial visual STLs (radians). */
export const CAD_CREASE_RAD = (42 * Math.PI) / 180;

/**
 * Box-project UVs from position + normal so STL meshes can use tangent-space maps.
 * Scale is world-meters per UV repeat (CAD is in meters).
 */
export function applyBoxUVs(geometry: THREE.BufferGeometry, scale: number): void {
  const pos = geometry.getAttribute('position');
  if (!pos) {
    return;
  }
  let nrm = geometry.getAttribute('normal');
  if (!nrm) {
    geometry.computeVertexNormals();
    nrm = geometry.getAttribute('normal');
  }
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(nrm.getX(i));
    const ny = Math.abs(nrm.getY(i));
    const nz = Math.abs(nrm.getZ(i));
    if (nx >= ny && nx >= nz) {
      uv[i * 2] = y * scale;
      uv[i * 2 + 1] = z * scale;
    } else if (ny >= nx && ny >= nz) {
      uv[i * 2] = x * scale;
      uv[i * 2 + 1] = z * scale;
    } else {
      uv[i * 2] = x * scale;
      uv[i * 2 + 1] = y * scale;
    }
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
