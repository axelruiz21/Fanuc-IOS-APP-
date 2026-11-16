import {
  BOLLARDS,
  CABINET,
  CELL_HALF,
  FENCE_HEIGHT,
  FENCE_PANEL_BOTTOM,
  FENCE_POST_SPACING,
  OVERHEAD_Z,
  cableWaypoints,
  fenceLayout,
  xzDistance,
} from '../app/viewer/cellLayout';

/** LR Mate 200iD reach is ~0.72 m; nothing structural may sit inside 1.2 m. */
const KEEP_OUT = 1.2;
/** Yellow tape outer edge: SAFETY_OUTER (0.14) × 8 m floor = 1.12 m. */
const TAPE_OUTER = 1.12;

describe('fence layout', () => {
  const { posts, panels } = fenceLayout();

  it('forms an L of several bays with one shared corner post', () => {
    expect(posts.length).toBeGreaterThanOrEqual(6);
    const corners = posts.filter((p) => p[0] === -CELL_HALF && p[2] === -CELL_HALF);
    expect(corners).toHaveLength(1);
    expect(panels.length).toBe(posts.length - 1);
  });

  it('keeps every post outside the robot keep-out and behind the tape', () => {
    for (const p of posts) {
      expect(xzDistance(p)).toBeGreaterThan(KEEP_OUT);
      expect(Math.min(p[0], p[2])).toBeLessThanOrEqual(-CELL_HALF);
    }
  });

  it('ends the back run behind the robot so no post crosses the arm from the hero camera', () => {
    const backPosts = posts.filter((p) => p[2] === -CELL_HALF);
    expect(Math.max(...backPosts.map((p) => p[0]))).toBeLessThan(0);
  });

  it('sizes panels to the bay and lifts them off the floor', () => {
    for (const panel of panels) {
      expect(panel.length).toBeGreaterThan(0.3);
      expect(panel.length).toBeLessThan(FENCE_POST_SPACING);
      expect(panel.center[1]).toBeGreaterThan(FENCE_PANEL_BOTTOM);
      expect(panel.center[1]).toBeLessThan(FENCE_HEIGHT);
    }
  });
});

describe('cabinet and cable', () => {
  it('parks the controller inside the fenced corner, clear of the arm', () => {
    expect(CABINET.position[0]).toBeGreaterThan(-CELL_HALF);
    expect(CABINET.position[2]).toBeGreaterThan(-CELL_HALF);
    expect(xzDistance(CABINET.position)).toBeGreaterThan(0.9);
  });

  it('runs the dress cable from the base to the cabinet along the floor', () => {
    const pts = cableWaypoints();
    expect(pts.length).toBeGreaterThanOrEqual(4);
    const first = pts[0];
    const last = pts[pts.length - 1];
    expect(xzDistance(first)).toBeLessThan(0.25);
    expect(first[1]).toBeGreaterThan(0);
    expect(Math.abs(last[0] - CABINET.position[0])).toBeLessThan(CABINET.size[0] / 2 + 0.1);
    expect(Math.abs(last[2] - CABINET.position[2])).toBeLessThan(CABINET.size[2] / 2 + 0.1);
    for (const p of pts.slice(1, -1)) {
      expect(p[1]).toBeLessThan(0.1);
    }
  });
});

describe('bollards and overhead', () => {
  it('places bollards outside the tape on the open side', () => {
    expect(BOLLARDS.length).toBeGreaterThanOrEqual(2);
    for (const b of BOLLARDS) {
      expect(xzDistance(b)).toBeGreaterThan(TAPE_OUTER);
      expect(b[2]).toBeGreaterThan(0);
    }
  });

  it('gives every fixture a beam to hang from', () => {
    expect(new Set(OVERHEAD_Z).size).toBe(OVERHEAD_Z.length);
    expect(OVERHEAD_Z.length).toBeGreaterThanOrEqual(2);
  });
});
