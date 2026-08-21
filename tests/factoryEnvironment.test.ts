import { createFactoryEnvironmentScene } from '../app/viewer/factoryEnvironment';

describe('factory IBL scene', () => {
  it('builds a disposable interior with several meshes and lights', () => {
    const { scene, dispose } = createFactoryEnvironmentScene();
    expect(scene.children.length).toBeGreaterThanOrEqual(5);
    expect(() => dispose()).not.toThrow();
  });
});
