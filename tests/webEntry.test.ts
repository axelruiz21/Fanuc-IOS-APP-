import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('web entry', () => {
  const entry = fs.readFileSync(path.join(ROOT, 'App.tsx'), 'utf8');

  it('imports @expo/metro-runtime so dynamic import() resolves on web', () => {
    // Without this, every lazy chunk (CAD meshes, HDR, post stack) fails on
    // web with "Requiring unknown module" and silently falls back.
    const runtime = entry.indexOf("import '@expo/metro-runtime';");
    const app = entry.indexOf("from './app/App'");
    expect(runtime).toBeGreaterThanOrEqual(0);
    expect(app).toBeGreaterThan(runtime);
  });

  it('declares @expo/metro-runtime as a dependency', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies['@expo/metro-runtime']).toBeDefined();
  });
});
