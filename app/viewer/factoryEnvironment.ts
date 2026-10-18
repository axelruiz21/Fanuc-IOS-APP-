/**
 * In-memory industrial bay for PMREM. No CDN HDR.
 * Caller must dispose after baking.
 */
import * as THREE from 'three';

function addBox(
  scene: THREE.Scene,
  material: THREE.Material,
  position: [number, number, number],
  scale: [number, number, number]
): void {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  scene.add(mesh);
}

export function createFactoryEnvironmentScene(): {
  scene: THREE.Scene;
  dispose: () => void;
} {
  const scene = new THREE.Scene();

  const wall = new THREE.MeshStandardMaterial({
    color: 0x4c4b46,
    roughness: 0.88,
    metalness: 0.04,
    side: THREE.BackSide,
  });
  const floor = new THREE.MeshStandardMaterial({
    color: 0x2a2926,
    roughness: 0.78,
    metalness: 0.12,
  });
  const coolWindow = new THREE.MeshBasicMaterial({ color: 0x9eb4c8 });
  const warmPanel = new THREE.MeshBasicMaterial({ color: 0xfff3dc });

  const shell = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), wall);
  shell.scale.set(16, 7.5, 16);
  shell.position.set(0, 2.6, 0);
  scene.add(shell);

  const slab = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), floor);
  slab.scale.set(16, 0.2, 16);
  slab.position.set(0, -0.1, 0);
  scene.add(slab);

  addBox(scene, coolWindow, [7.9, 2.4, 0], [0.08, 3.6, 7]);
  addBox(scene, warmPanel, [-2.4, 3.55, -1.2], [2.8, 0.04, 0.35]);
  addBox(scene, warmPanel, [2.2, 3.55, 1.4], [2.8, 0.04, 0.35]);
  addBox(scene, warmPanel, [0, 3.55, 0], [3.4, 0.04, 0.35]);

  const key = new THREE.PointLight(0xfff1dd, 900, 40, 2);
  key.position.set(0.4, 6.2, 0.2);
  scene.add(key);

  const fill = new THREE.PointLight(0xb7c6d4, 280, 36, 2);
  fill.position.set(6.5, 2.8, 1.2);
  scene.add(fill);

  const bounce = new THREE.PointLight(0xc5a572, 90, 24, 2);
  bounce.position.set(-3.2, 0.6, -2.4);
  scene.add(bounce);

  const dispose = (): void => {
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry.dispose();
        const mat = mesh.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
  };

  return { scene, dispose };
}
