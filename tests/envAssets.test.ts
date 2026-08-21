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
});
