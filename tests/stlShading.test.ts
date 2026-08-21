import * as THREE from 'three';
import { applyBoxUVs } from '../app/viewer/stlShading';

describe('STL box UVs', () => {
  it('writes one uv per position vertex', () => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3)
    );
    geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3)
    );
    applyBoxUVs(geometry, 2);
    const uv = geometry.getAttribute('uv');
    expect(uv.count).toBe(3);
    expect(uv.itemSize).toBe(2);
    expect(uv.getX(1)).not.toBe(uv.getX(0));
  });
});
