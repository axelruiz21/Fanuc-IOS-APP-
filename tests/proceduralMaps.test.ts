import {
  CONCRETE_TILES,
  SAFETY_INNER,
  SAFETY_OUTER,
  brushedMetalRoughness,
  concreteAlbedo,
  concreteRoughness,
  paintNormal,
  paintRoughness,
  pixelIndex,
} from '../app/viewer/proceduralMaps';

function luma(data: Uint8Array, size: number, x: number, y: number): number {
  const i = pixelIndex(size, x, y);
  return (data[i] * 3 + data[i + 1] * 4 + data[i + 2]) / 8;
}

describe('procedural work-cell maps', () => {
  const SIZE = 64;

  it('emits RGBA buffers of size*size*4', () => {
    expect(concreteAlbedo(SIZE).length).toBe(SIZE * SIZE * 4);
    expect(concreteRoughness(SIZE).length).toBe(SIZE * SIZE * 4);
    expect(paintNormal(SIZE).length).toBe(SIZE * SIZE * 4);
    expect(paintRoughness(SIZE).length).toBe(SIZE * SIZE * 4);
    expect(brushedMetalRoughness(SIZE).length).toBe(SIZE * SIZE * 4);
  });

  it('makes grout darker than the concrete field', () => {
    const albedo = concreteAlbedo(SIZE);
    const tile = SIZE / CONCRETE_TILES;
    const groutX = tile;
    const fieldX = Math.floor(tile / 2);
    const y = Math.floor(tile / 2);
    expect(luma(albedo, SIZE, groutX, y)).toBeLessThan(luma(albedo, SIZE, fieldX, y));
  });

  it('paints a yellow safety square around the robot pad', () => {
    const albedo = concreteAlbedo(SIZE);
    const u = 0.5;
    const v = 0.5 - (SAFETY_INNER + SAFETY_OUTER) / 2;
    const x = Math.floor(u * SIZE);
    const y = Math.floor(v * SIZE);
    const i = pixelIndex(SIZE, x, y);
    expect(albedo[i]).toBeGreaterThan(160);
    expect(albedo[i + 1]).toBeGreaterThan(110);
    expect(albedo[i + 2]).toBeLessThan(90);
  });

  it('does not emit a flat tangent-space normal map', () => {
    const nrm = paintNormal(SIZE);
    let distinct = 0;
    const seen = new Set<string>();
    for (let i = 0; i < nrm.length; i += 4) {
      seen.add(`${nrm[i]},${nrm[i + 1]},${nrm[i + 2]}`);
      if (seen.size > 8) {
        distinct = seen.size;
        break;
      }
    }
    expect(distinct).toBeGreaterThan(8);
  });
});
