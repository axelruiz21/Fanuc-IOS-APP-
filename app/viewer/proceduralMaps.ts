/** Deterministic RGBA maps for the work cell. No THREE, no WebGL. */

export const CONCRETE_TILES = 8;
/** UV half-extent of the yellow tape inner edge (from floor center). */
export const SAFETY_INNER = 0.12;
/** UV half-extent of the yellow tape outer edge. */
export const SAFETY_OUTER = 0.14;

export function pixelIndex(size: number, x: number, y: number): number {
  return (y * size + x) * 4;
}

function u32(n: number): number {
  return n >>> 0;
}

function hash2(x: number, y: number, seed: number): number {
  let n = u32(x * 374761393 + y * 668265263 + seed * 1274126177);
  n = u32((n ^ (n >>> 13)) * 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}

function rand01(x: number, y: number, seed: number): number {
  return hash2(x, y, seed) / 4294967295;
}

function fade(t: number): number {
  return t * t * (3 - 2 * t);
}

function valueNoise(x: number, y: number, seed: number): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const sx = fade(x - x0);
  const sy = fade(y - y0);
  const a = rand01(x0, y0, seed);
  const b = rand01(x0 + 1, y0, seed);
  const c = rand01(x0, y0 + 1, seed);
  const d = rand01(x0 + 1, y0 + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

function fbm(x: number, y: number, seed: number, octaves = 5): number {
  let v = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i += 1) {
    v += amp * valueNoise(x * freq, y * freq, seed + i * 19);
    amp *= 0.5;
    freq *= 2;
  }
  return v;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function alloc(size: number): Uint8Array {
  return new Uint8Array(size * size * 4);
}

function onSafetyTape(u: number, v: number): boolean {
  const du = Math.abs(u - 0.5);
  const dv = Math.abs(v - 0.5);
  const inner = SAFETY_INNER;
  const outer = SAFETY_OUTER;
  return (
    (du >= inner && du <= outer && dv <= outer) ||
    (dv >= inner && dv <= outer && du <= outer)
  );
}

export function concreteAlbedo(size: number): Uint8Array {
  const data = alloc(size);
  const tile = size / CONCRETE_TILES;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const n = fbm(u * 10, v * 10, 11);
      const stain = fbm(u * 3.2, v * 3.2, 29);
      let r = 48 + n * 22 + stain * 8;
      let g = 46 + n * 20 + stain * 6;
      let b = 42 + n * 16 + stain * 4;
      const gx = Math.abs((x + 0.5) % tile) < 1.15 || Math.abs((x + 0.5) % tile - tile) < 1.15;
      const gy = Math.abs((y + 0.5) % tile) < 1.15 || Math.abs((y + 0.5) % tile - tile) < 1.15;
      if (gx || gy) {
        r *= 0.62;
        g *= 0.62;
        b *= 0.6;
      }
      if (onSafetyTape(u, v)) {
        r = 214 + n * 18;
        g = 168 + n * 12;
        b = 28 + n * 8;
      }
      const i = pixelIndex(size, x, y);
      data[i] = clampByte(r);
      data[i + 1] = clampByte(g);
      data[i + 2] = clampByte(b);
      data[i + 3] = 255;
    }
  }
  return data;
}

export function concreteRoughness(size: number): Uint8Array {
  const data = alloc(size);
  const tile = size / CONCRETE_TILES;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      let rough = 0.72 + fbm(u * 14, v * 14, 41) * 0.22;
      const gx = Math.abs((x + 0.5) % tile) < 1.15;
      const gy = Math.abs((y + 0.5) % tile) < 1.15;
      if (gx || gy) {
        rough = Math.min(1, rough + 0.12);
      }
      if (onSafetyTape(u, v)) {
        rough = 0.48 + fbm(u * 20, v * 20, 7) * 0.12;
      }
      const c = clampByte(rough * 255);
      const i = pixelIndex(size, x, y);
      data[i] = c;
      data[i + 1] = c;
      data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  return data;
}

export type PaintNormalOptions = { scratches?: boolean };

export function paintNormal(size: number, opts: PaintNormalOptions = {}): Uint8Array {
  const scratches = opts.scratches !== false;
  const data = alloc(size);
  const strength = 1.6;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const eps = 1 / size;
      const height = (uu: number, vv: number): number => {
        let h = fbm(uu * 28, vv * 28, 63);
        if (scratches) {
          const streak = valueNoise(uu * 72, vv * 9, 201);
          h += Math.max(0, streak - 0.84) * 1.8;
        }
        return h;
      };
      const nx = (height(u - eps, v) - height(u + eps, v)) * strength;
      const ny = (height(u, v - eps) - height(u, v + eps)) * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = pixelIndex(size, x, y);
      data[i] = clampByte(((nx / len) * 0.5 + 0.5) * 255);
      data[i + 1] = clampByte(((ny / len) * 0.5 + 0.5) * 255);
      data[i + 2] = clampByte(((nz / len) * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  return data;
}

export function paintRoughness(size: number): Uint8Array {
  const data = alloc(size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const speckle = fbm(u * 18, v * 18, 77);
      const wear = fbm(u * 5.5, v * 5.5, 91);
      const c = clampByte((0.22 + speckle * 0.18 + wear * 0.15) * 255);
      const i = pixelIndex(size, x, y);
      data[i] = c;
      data[i + 1] = c;
      data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  return data;
}

export function brushedMetalRoughness(size: number): Uint8Array {
  const data = alloc(size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const stroke = valueNoise(u * 4, v * 90, 101);
      const blotch = fbm(u * 5, v * 5, 131);
      const fingerprint = blotch > 0.62 ? 0.2 : 0;
      const c = clampByte((0.22 + stroke * 0.35 + fingerprint) * 255);
      const i = pixelIndex(size, x, y);
      data[i] = c;
      data[i + 1] = c;
      data[i + 2] = c;
      data[i + 3] = 255;
    }
  }
  return data;
}
