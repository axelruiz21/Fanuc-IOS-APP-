/**
 * Headless work-cell dressing layout. Meters, world Y-up, robot base at the
 * origin facing +x. No THREE, no WebGL — WorkCell.tsx turns this into meshes.
 */
export type Vec3 = [number, number, number];

/** Fence runs sit just outside the yellow tape square (tape outer edge ≈ 1.12 m). */
export const CELL_HALF = 1.8;
export const FENCE_HEIGHT = 1.45;
export const FENCE_POST_SIZE = 0.045;
export const FENCE_PANEL_BOTTOM = 0.1;
export const FENCE_POST_SPACING = 0.82;
/**
 * Runs stop short of the camera side so the cell reads open toward +x / +z.
 * The back run ends behind the cabinet so no post crosses the arm silhouette
 * from the hero camera; the left run continues toward the viewer.
 */
export const FENCE_BACK_END = -0.45;
export const FENCE_LEFT_END = 1.2;
/** Welded-wire cell pitch; drives the alpha-map repeat on fence panels. */
export const FENCE_MESH_PITCH = 0.05;

export type FencePanel = { center: Vec3; length: number; rotationY: number };
export type FenceLayout = { posts: Vec3[]; panels: FencePanel[] };

function fenceRun(from: number, to: number, fixed: number, axis: 'x' | 'z'): FenceLayout {
  const length = to - from;
  const segments = Math.max(1, Math.ceil(length / FENCE_POST_SPACING));
  const step = length / segments;
  const posts: Vec3[] = [];
  const panels: FencePanel[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = from + step * i;
    posts.push(axis === 'x' ? [t, 0, fixed] : [fixed, 0, t]);
  }
  const panelY = FENCE_PANEL_BOTTOM + (FENCE_HEIGHT - FENCE_PANEL_BOTTOM) / 2;
  for (let i = 0; i < segments; i += 1) {
    const mid = from + step * (i + 0.5);
    panels.push({
      center: axis === 'x' ? [mid, panelY, fixed] : [fixed, panelY, mid],
      length: step - FENCE_POST_SIZE,
      rotationY: axis === 'x' ? 0 : Math.PI / 2,
    });
  }
  return { posts, panels };
}

/** L-shaped guard: back run along z = -CELL_HALF, left run along x = -CELL_HALF. */
export function fenceLayout(): FenceLayout {
  const back = fenceRun(-CELL_HALF, FENCE_BACK_END, -CELL_HALF, 'x');
  const left = fenceRun(-CELL_HALF, FENCE_LEFT_END, -CELL_HALF, 'z');
  // Both runs start at the shared corner post; keep one copy.
  return { posts: [...back.posts, ...left.posts.slice(1)], panels: [...back.panels, ...left.panels] };
}

export const CABINET = {
  position: [-0.92, 0, -1.02] as Vec3,
  size: [0.5, 0.74, 0.4] as Vec3,
  rotationY: 0.42,
};

/** Dress cable: base connector → floor → cabinet underside. */
export function cableWaypoints(): Vec3[] {
  return [
    [-0.15, 0.15, 0.03],
    [-0.3, 0.06, 0.04],
    [-0.5, 0.022, -0.08],
    [-0.72, 0.022, -0.5],
    [-0.86, 0.022, -0.82],
    [-0.92, 0.12, -0.92],
  ];
}

export const CABLE_RADIUS = 0.013;
export const BASE_CONNECTOR = { position: [-0.12, 0.15, 0.03] as Vec3, size: [0.05, 0.09, 0.11] as Vec3 };

export const BOLLARD_RADIUS = 0.07;
export const BOLLARD_HEIGHT = 0.8;
export const BOLLARDS: Vec3[] = [
  [1.3, 0, 1.3],
  [-1.3, 0, 1.3],
];

export const BEAM_Y = 2.86;
export const BEAM_SECTION = 0.16;
export const BEAM_LENGTH = 5.6;
export const FIXTURE_Y = 2.72;
/** z positions shared by the ceiling beams and the fixtures that hang from them. */
export const OVERHEAD_Z: number[] = [-0.9, -0.15, 0.35];
export const FIXTURE_X: number[] = [-0.85, 0.1, 0.95];

/** Machined slugs on the weld table, in the table group's local frame. */
export const TABLE_TOP_Y = 0.36;
export const TABLE_PARTS: Vec3[] = [
  [-0.12, TABLE_TOP_Y + 0.045, 0.08],
  [-0.05, TABLE_TOP_Y + 0.045, -0.1],
  [0.14, TABLE_TOP_Y + 0.045, 0.1],
];
export const TABLE_PART_RADIUS = 0.022;
export const TABLE_PART_HEIGHT = 0.05;

export const TOTE = { position: [1.0, 0.12, 0.62] as Vec3, size: [0.38, 0.24, 0.28] as Vec3 };

export function xzDistance(p: Vec3): number {
  return Math.hypot(p[0], p[2]);
}
