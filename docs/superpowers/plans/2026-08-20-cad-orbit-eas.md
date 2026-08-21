# CAD, Orbit Gestures, and EAS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Students see ROS-Industrial LR Mate 200iD CAD posed by `currentJoints`, can orbit/pinch/pan on web and native, and the repo has a complete EAS config so Axel can `eas init` / `eas build` locally.

**Architecture:** Headless `cadFrames.ts` maps each visual STL onto `jointTransforms` (base = identity). Headless `orbit.ts` is the spherical camera. Web uses damped drei `OrbitControls`; native uses `PanResponder` + `useFrame`. EAS is config-only (no billed build).

**Tech Stack:** Expo 50, R3F 8, drei 9, three 0.160, expo-gl ~13.6, expo-asset, expo-dev-client, Jest 29 (Node).

## Global Constraints

- Do not rewrite kinematics. Renderer never calls `inverse`.
- LR Mate 200iD base model only (not /7L, /4S). Visual STLs, not collision.
- Wrist / `rx,ry,rz` XYZ Euler RPY contract unchanged.
- Unreachable / singular / joint_limit still fail MOVE; last pose unchanged.
- Jest stays Node — no WebGL in tests.
- No invented EAS project UUID. No billed `eas build`.
- Bundle IDs: `com.axelruiz.fanucpendant`.
- Stay on `cursor/lrmate-ik-web-508a`; extend PR #2.

---

### Task 1: Vendor visual STLs and write failing CAD/orbit tests

**Files:**
- Create: `assets/lrmate200id/visual/{base_link,link_1,link_2,link_3,link_4,link_5,link_6}.stl`
- Create: `assets/lrmate200id/LICENSE`, `assets/lrmate200id/ATTRIBUTION.md`
- Create: `tests/cadFrames.test.ts`, `tests/orbit.test.ts`

**Interfaces:**
- Produces: vendored files at those paths; tests import `cadLinkOriginMm`, `CAD_LINK_FRAME_INDEX`, `orbitFromCameraPosition`, `cameraPosition`, `rotateOrbit`, `zoomOrbit`, `panOrbit` from `app/viewer/*` (not yet implemented).

- [ ] **Step 1: Download STLs** from `https://raw.githubusercontent.com/ros-industrial/fanuc/noetic-devel/fanuc_lrmate200id_support/meshes/lrmate200id/visual/{name}.stl` and copy the BSD LICENSE from that repo.

- [ ] **Step 2: Write failing tests** in `tests/cadFrames.test.ts` and `tests/orbit.test.ts` (see spec §5).

- [ ] **Step 3: Run tests and confirm they fail** because `app/viewer/cadFrames.ts` / `orbit.ts` do not exist.

- [ ] **Step 4: Commit** spec, plan, assets, and failing tests.

---

### Task 2: Implement cadFrames + orbit (green)

**Files:**
- Create: `app/viewer/cadFrames.ts`
- Create: `app/viewer/orbit.ts`

**Interfaces:**
- Consumes: `jointTransforms`, `forward`, `identity`, `translationOf`, `clamp` from kinematics/math.
- Produces:

```ts
export const CAD_LINK_IDS = ['base_link', 'link_1', 'link_2', 'link_3', 'link_4', 'link_5', 'link_6'] as const;
export type CadLinkId = typeof CAD_LINK_IDS[number];
export const CAD_LINK_FRAME_INDEX: Record<CadLinkId, number | null>; // null = identity
export function cadLinkTransform(joints: Joints, id: CadLinkId): Mat4;
export function cadLinkOriginMm(joints: Joints, id: CadLinkId): [number, number, number];
export function mat4ToThreeSetArgs(T: Mat4): readonly number[]; // 16 row-major args for THREE.Matrix4.set

export type Vec3 = [number, number, number];
export type OrbitState = { yaw: number; pitch: number; radius: number; target: Vec3 };
export const ORBIT_MIN_RADIUS = 0.4;
export const ORBIT_MAX_RADIUS = 8;
export function orbitFromCameraPosition(position: Vec3, target?: Vec3): OrbitState;
export function cameraPosition(state: OrbitState): Vec3;
export function rotateOrbit(state: OrbitState, dYaw: number, dPitch: number): OrbitState;
export function zoomOrbit(state: OrbitState, factor: number): OrbitState; // pinch-out (factor>1) zooms in
export function panOrbit(state: OrbitState, rightDelta: number, upDelta: number): OrbitState;
```

- [ ] **Step 1: Minimal implementation to pass tests.**
- [ ] **Step 2: Run `npx jest tests/cadFrames.test.ts tests/orbit.test.ts` — PASS.**
- [ ] **Step 3: Commit.**

---

### Task 3: CAD viewer + orbit drivers

**Files:**
- Create: `metro.config.js` (`stl` in `assetExts`)
- Create: `app/types/assets.d.ts`
- Create: `app/components/CadArm.tsx`, `app/components/PrimitiveArm.tsx`
- Create: `app/components/OrbitCapture.tsx`, `OrbitCapture.native.tsx`
- Create: `app/components/OrbitDriver.tsx`, `OrbitDriver.native.tsx`
- Modify: `app/components/RobotArmCanvas.tsx`
- Modify: `docs/superpowers/specs/2026-08-16-native-3d-design.md` (CAD/orbit/EAS no longer out of scope)

**Interfaces:**
- Consumes: `cadLinkTransform`, `CAD_LINK_IDS`, orbit helpers, `expo-asset`, `STLLoader`.
- Produces: `RobotArmViewer` still `{ joints, currentPosition }`; load failure → PrimitiveArm.

- [ ] **Step 1: Wire CadArm + platform orbit. Keep Z-up group rotation. Do not call `inverse`.**
- [ ] **Step 2: `npx tsc --noEmit` clean.**
- [ ] **Step 3: Commit.**

---

### Task 4: EAS config + README

**Files:**
- Create: `eas.json`, `.gitignore`
- Modify: `app.json`, `package.json` (add `expo-dev-client` via `npx expo install`), `README.md`
- Create: `tests/easConfig.test.ts`

- [ ] **Step 1: Write `tests/easConfig.test.ts` asserting profiles and bundle IDs; watch it fail.**
- [ ] **Step 2: Add config so the test passes. No fake projectId.**
- [ ] **Step 3: `npm test` and `npx tsc --noEmit`. Commit, push, update PR #2.**
