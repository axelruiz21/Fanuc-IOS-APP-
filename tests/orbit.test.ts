import {
  ORBIT_MAX_RADIUS,
  ORBIT_MIN_RADIUS,
  cameraPosition,
  orbitFromCameraPosition,
  panOrbit,
  rotateOrbit,
  zoomOrbit,
  type OrbitState,
} from '../app/viewer/orbit';

const DEFAULT_POS: [number, number, number] = [1.5, 1.1, 1.5];

describe('spherical orbit', () => {
  it('round-trips the default camera position', () => {
    const orbit = orbitFromCameraPosition(DEFAULT_POS);
    const pos = cameraPosition(orbit);
    expect(pos[0]).toBeCloseTo(DEFAULT_POS[0], 6);
    expect(pos[1]).toBeCloseTo(DEFAULT_POS[1], 6);
    expect(pos[2]).toBeCloseTo(DEFAULT_POS[2], 6);
    expect(orbit.target).toEqual([0, 0, 0]);
  });

  it('clamps pitch so the camera cannot flip over the poles', () => {
    const start = orbitFromCameraPosition(DEFAULT_POS);
    const up = rotateOrbit(start, 0, 20);
    const down = rotateOrbit(start, 0, -20);
    expect(up.pitch).toBeLessThan(Math.PI / 2 - 0.05);
    expect(down.pitch).toBeGreaterThan(-Math.PI / 2 + 0.05);
    expect(up.radius).toBeCloseTo(start.radius, 10);
  });

  it('clamps radius', () => {
    const start = orbitFromCameraPosition(DEFAULT_POS);
    const near = zoomOrbit(start, 1000);
    const far = zoomOrbit(start, 0.001);
    expect(near.radius).toBe(ORBIT_MIN_RADIUS);
    expect(far.radius).toBe(ORBIT_MAX_RADIUS);
  });

  it('zooms in when pinch factor is greater than 1', () => {
    const start = orbitFromCameraPosition(DEFAULT_POS);
    const zoomed = zoomOrbit(start, 2);
    expect(zoomed.radius).toBeCloseTo(start.radius / 2, 6);
    expect(zoomed.yaw).toBe(start.yaw);
    expect(zoomed.pitch).toBe(start.pitch);
  });

  it('pans in the camera plane without changing radius', () => {
    const start = orbitFromCameraPosition(DEFAULT_POS);
    const panned: OrbitState = panOrbit(start, 0.2, 0);
    expect(panned.radius).toBeCloseTo(start.radius, 6);
    expect(panned.target[0]).not.toBeCloseTo(start.target[0], 6);
    const pos = cameraPosition(panned);
    const dx = pos[0] - panned.target[0];
    const dy = pos[1] - panned.target[1];
    const dz = pos[2] - panned.target[2];
    expect(Math.hypot(dx, dy, dz)).toBeCloseTo(panned.radius, 6);
  });
});
