import { clamp } from '../kinematics/math';

export type Vec3 = [number, number, number];

export type OrbitState = {
  yaw: number;
  pitch: number;
  radius: number;
  target: Vec3;
};

export const ORBIT_MIN_RADIUS = 0.4;
export const ORBIT_MAX_RADIUS = 8;
export const ORBIT_MIN_PITCH = -Math.PI / 2 + 0.08;
export const ORBIT_MAX_PITCH = Math.PI / 2 - 0.08;

export const DEFAULT_CAMERA_POSITION: Vec3 = [1.5, 1.1, 1.5];

function hypot3(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

function normalize(v: Vec3): Vec3 {
  const n = hypot3(v);
  if (n < 1e-12) {
    return [0, 0, 0];
  }
  return [v[0] / n, v[1] / n, v[2] / n];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function orbitFromCameraPosition(position: Vec3, target: Vec3 = [0, 0, 0]): OrbitState {
  const offset: Vec3 = [position[0] - target[0], position[1] - target[1], position[2] - target[2]];
  const radius = hypot3(offset);
  if (radius < 1e-9) {
    return { yaw: Math.PI / 4, pitch: 0.4, radius: 2, target: [...target] };
  }
  const pitch = Math.asin(clamp(offset[1] / radius, -1, 1));
  const yaw = Math.atan2(offset[2], offset[0]);
  return { yaw, pitch, radius, target: [...target] };
}

export function cameraPosition(state: OrbitState): Vec3 {
  const cp = Math.cos(state.pitch);
  return [
    state.target[0] + state.radius * Math.cos(state.yaw) * cp,
    state.target[1] + state.radius * Math.sin(state.pitch),
    state.target[2] + state.radius * Math.sin(state.yaw) * cp,
  ];
}

export function rotateOrbit(state: OrbitState, dYaw: number, dPitch: number): OrbitState {
  return {
    ...state,
    yaw: state.yaw + dYaw,
    pitch: clamp(state.pitch + dPitch, ORBIT_MIN_PITCH, ORBIT_MAX_PITCH),
    target: [...state.target],
  };
}

/** Pinch-out (`factor > 1`) zooms in by shrinking radius. */
export function zoomOrbit(state: OrbitState, factor: number): OrbitState {
  const safe = factor === 0 || !Number.isFinite(factor) ? 1 : factor;
  return {
    ...state,
    radius: clamp(state.radius / safe, ORBIT_MIN_RADIUS, ORBIT_MAX_RADIUS),
    target: [...state.target],
  };
}

export function panOrbit(state: OrbitState, rightDelta: number, upDelta: number): OrbitState {
  const pos = cameraPosition(state);
  const forward = normalize([
    state.target[0] - pos[0],
    state.target[1] - pos[1],
    state.target[2] - pos[2],
  ]);
  let right = normalize(cross(forward, [0, 1, 0]));
  if (hypot3(right) < 1e-8) {
    right = [1, 0, 0];
  }
  const up = normalize(cross(right, forward));
  return {
    ...state,
    target: [
      state.target[0] + right[0] * rightDelta + up[0] * upDelta,
      state.target[1] + right[1] * rightDelta + up[1] * upDelta,
      state.target[2] + right[2] * rightDelta + up[2] * upDelta,
    ],
  };
}

export const DEFAULT_ORBIT: OrbitState = orbitFromCameraPosition(DEFAULT_CAMERA_POSITION);
