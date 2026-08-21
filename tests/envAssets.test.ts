import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const ENV = path.join(ROOT, 'assets/env');

describe('vendored machine-shop HDR', () => {
  it('ships a CC0 HDR larger than 50 KB plus a license', () => {
    const hdr = path.join(ENV, 'machine_shop_01_2k.hdr');
    expect(fs.existsSync(hdr)).toBe(true);
    expect(fs.statSync(hdr).size).toBeGreaterThan(50_000);
    const license = fs.readFileSync(path.join(ENV, 'LICENSE'), 'utf8');
    expect(/CC0|Polyhaven|Poly Haven/i.test(license)).toBe(true);
  });

  it('registers hdr as a Metro asset extension', () => {
    const src = fs.readFileSync(path.join(ROOT, 'metro.config.js'), 'utf8');
    expect(src).toContain("'hdr'");
  });

  it('keeps postprocessing out of the native effects file', () => {
    const native = fs.readFileSync(
      path.join(ROOT, 'app/components/RobotEffects.native.tsx'),
      'utf8'
    );
    expect(native).not.toContain('@react-three/postprocessing');
    expect(native).toContain('return null');
  });

  it('puts a ToneMapping pass in the web composer', () => {
    const web = fs.readFileSync(
      path.join(ROOT, 'app/components/RobotEffects.tsx'),
      'utf8'
    );
    expect(web).toContain('ToneMapping');
    expect(web).toContain('ACES_FILMIC');
  });

  it('uses an 8-bit composer target and leaves the SSGI normal pass off', () => {
    const web = fs.readFileSync(
      path.join(ROOT, 'app/components/RobotEffects.tsx'),
      'utf8'
    );
    expect(web).toContain('UnsignedByteType');
    expect(web).toContain('frameBufferType');
    expect(web).not.toContain('enableNormalPass');
  });

  it('lazy-loads the 3D viewer so a WebGL chunk failure cannot blank the pendant', () => {
    const app = fs.readFileSync(path.join(ROOT, 'app/App.tsx'), 'utf8');
    expect(app).not.toMatch(
      /import\s*\{[^}]*RobotArmViewer[^}]*\}\s*from\s*['"]\.\/components\/RobotArm['"]/
    );
    expect(app).toMatch(/import\(\s*['"]\.\/components\/RobotArm['"]\s*\)/);
    expect(app).toContain('Loading arm');
  });

  it('lazy-loads RobotEffects so a postprocessing import failure cannot blank the canvas', () => {
    const canvas = fs.readFileSync(
      path.join(ROOT, 'app/components/RobotArmCanvas.tsx'),
      'utf8'
    );
    expect(canvas).not.toMatch(
      /import\s*\{[^}]*RobotEffects[^}]*\}\s*from\s*['"]\.\/RobotEffects['"]/
    );
    expect(canvas).toMatch(/import\(\s*['"]\.\/RobotEffects['"]\s*\)/);
  });

  it('does not require the HDR from RobotStudio module scope', () => {
    const studio = fs.readFileSync(
      path.join(ROOT, 'app/components/RobotStudio.tsx'),
      'utf8'
    );
    expect(studio).not.toContain("require('../../assets/env/machine_shop_01_2k.hdr')");
    expect(studio).toMatch(/import\(\s*['"]\.\/loadMachineShopHdr['"]\s*\)/);
    expect(studio).toContain('Factory IBL failed');
  });

  it('loads the HDR from an isolated module so Metro parse failure cannot blank the canvas', () => {
    const loader = fs.readFileSync(
      path.join(ROOT, 'app/components/loadMachineShopHdr.ts'),
      'utf8'
    );
    expect(loader).toContain("require('../../assets/env/machine_shop_01_2k.hdr')");
  });

  it('keeps a standard floor on web so a reflector target cannot replace the hero', () => {
    const cell = fs.readFileSync(
      path.join(ROOT, 'app/components/WorkCell.tsx'),
      'utf8'
    );
    expect(cell).not.toContain('MeshReflectorMaterial');
    expect(cell).toContain('meshStandardMaterial');
  });

  it('hides the nested Arm title on the 2D fallback', () => {
    const app = fs.readFileSync(path.join(ROOT, 'app/App.tsx'), 'utf8');
    const viewport = fs.readFileSync(
      path.join(ROOT, 'app/components/Viewport3D.tsx'),
      'utf8'
    );
    expect(viewport).toContain('hideTitle');
    expect(app).toContain('hideTitle');
  });
});
