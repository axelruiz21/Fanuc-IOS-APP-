# LR Mate 200iD IK + Web 3D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MOVE uses analytic LR Mate 200iD IK (fail on unreachable/singular); web shows a 6-link arm from `currentJoints`.

**Architecture:** Headless `app/kinematics` (URDF-chain FK + Pieper IK, no React/Three). Interpreter stores `currentJoints` and calls `inverse` on MOVE. Web `RobotArmViewer` draws those joints; native keeps `Viewport3D`.

**Tech Stack:** TypeScript, Jest (Node), Expo 50 web (`react-native-web`), Three.js / `@react-three/fiber` DOM Canvas.

## Global Constraints

- Geometry: ROS-Industrial LR Mate 200iD URDF chain (not /7L, /4S).
- `inverse` returns `{ ok: true, joints }` or `{ ok: false, reason: 'unreachable' | 'singular' | 'joint_limit' }`.
- Unreachable/singular/joint_limit: MOVE fails; last pose and joints unchanged.
- `rx,ry,rz` are XYZ Euler RPY degrees, not FANUC WPR. `R = Rz(rz)*Ry(ry)*Rx(rx)`.
- Kinematics module must not import React, Three, or React Native.
- Web: R3F DOM Canvas. No `expo-gl` this slice. Non-web: existing `Viewport3D`.
- Jump to IK solution; no blending. No CAD meshes.
- `Joints` is `[j1,j2,j3,j4,j5,j6]` radians.
- Wrist singular if `|J5| < 1e-3` rad.
- Tip error after successful IK: hypot of mm deltas < 1.
- Existing Jest suite must stay green (adjust P[1]/P[2] seeds only if IK requires reachable poses).

---

## File map

| File | Role |
|------|------|
| `app/kinematics/math.ts` | 4x4 transforms, RPY, wrapPi |
| `app/kinematics/lrmate200id.ts` | URDF origins, axes, limits, HOME_JOINTS |
| `app/kinematics/solve.ts` | `forward`, `inverse` |
| `app/kinematics/index.ts` | Public exports |
| `tests/kinematics.test.ts` | FK/IK Jest tests |
| `app/utils/interpreter.ts` | `currentJoints`, MOVE/J/L call IK |
| `tests/interpreter.test.ts` | MOVE reachable / unreachable |
| `app/components/RobotArm.tsx` | Web 6-link viewer from `joints` |
| `app/components/RobotArm.web.tsx` | Re-export 3D component (do not use 2D canvas on web) |
| `app/App.tsx` | Platform split |
| `package.json` | `react-native-web`, `react-dom@18.2`, `@expo/metro-runtime` |
| `README.md` | Honest 3D/IK status |

---

### Task 1: FK (URDF chain)

**Files:** Create `app/kinematics/math.ts`, `lrmate200id.ts`, `solve.ts` (`forward` only), `index.ts`; Create `tests/kinematics.test.ts`

- [ ] **Step 1: Write failing FK tests**

```typescript
import { forward, HOME_JOINTS } from '../app/kinematics';

describe('forward kinematics', () => {
  it('returns a finite pose at home', () => {
    const p = forward(HOME_JOINTS);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.z)).toBe(true);
  });

  it('freezes home FK as a golden pose', () => {
    const p = forward(HOME_JOINTS);
    expect(p).toEqual({
      x: expect.any(Number),
      y: expect.any(Number),
      z: expect.any(Number),
      rx: expect.any(Number),
      ry: expect.any(Number),
      rz: expect.any(Number),
    });
  });
});
```

After the first green run, replace the second test with exact golden numbers printed from `forward(HOME_JOINTS)`.

- [ ] **Step 2: Run test — fail (module missing)**

`npm test -- tests/kinematics.test.ts`

- [ ] **Step 3: Implement math + URDF FK**

`lrmate200id.ts` constants from spec §4 (meters, then convert pose to mm in `forward`).

FK: start at identity; for each joint `T = T * Trans(origin) * Rot(axis, angle)`.

Extract translation as mm; extract RPY from rotation matrix (XYZ intrinsic / R = Rz*Ry*Rx) with a standard `atan2` decomposition; handle gimbal lock.

- [ ] **Step 4: Print home pose, freeze golden test, all kinematics tests pass**

- [ ] **Step 5: Commit** `feat: add LR Mate 200iD forward kinematics`

---

### Task 2: Inverse kinematics

**Files:** Modify `app/kinematics/solve.ts`; Test `tests/kinematics.test.ts`

- [ ] **Step 1: Write failing IK tests** (round-trip, 1 mm tip, unreachable 2000 mm, singular)

Singular pose: use `forward` of a configuration with J5=0 (e.g. `[0, 0.4, 0.2, 0.3, 0, 0.5]`) as target with seed home — expect `singular`.

Unreachable: `{ x: 2000, y: 0, z: 0, rx: 180, ry: 0, rz: 0 }`.

Round-trip: several `q` inside limits.

- [ ] **Step 2: Run — fail (inverse not implemented)**

- [ ] **Step 3: Implement Pieper `inverse(target, seed)`**

Wrist center = tool origin − 80 mm along tool X (first column of R). Geometric J1–J3 for wrist; J4–J6 from remaining rotation. Enumerate valid branches; skip `|q5|<1e-3`; skip joint-limit violations; pick min squared wrapPi distance to seed.

- [ ] **Step 4: Tests pass**

- [ ] **Step 5: Commit** `feat: add analytic Pieper IK with fail reasons`

---

### Task 3: Interpreter MOVE uses IK

**Files:** Modify `app/utils/interpreter.ts`; `tests/interpreter.test.ts`; `app/store/index.ts` seeds if needed

- [ ] **Step 1: Failing tests** — MOVE reachable sets `currentJoints`; MOVE to 2000 mm fails and leaves previous position

- [ ] **Step 2: Run — fail**

- [ ] **Step 3: Add `currentJoints` to state/getState/reset; MOVE/J/L call `inverse`; throw `MOVE ${reason}`**

If seeded P[1]/P[2] fail IK, change seeds to reachable poses and update store/integration tests.

- [ ] **Step 4: `npm test` full suite green**

- [ ] **Step 5: Commit** `feat: reject or apply MOVE via IK`

---

### Task 4: Web 6-link viewer + Expo web deps

**Files:** `RobotArm.tsx`, `RobotArm.web.tsx`, `App.tsx`, `package.json`, `README.md`

- [ ] **Step 1: Viewer takes `joints: Joints`; draw 6 links from FK frames (or duplicated URDF steps). App: web RobotArmViewer else Viewport3D.**

- [ ] **Step 2: RobotArm.web.tsx re-exports RobotArm.tsx**

- [ ] **Step 3: Add `react-dom@18.2.0`, `react-native-web@~0.19.6`, `@expo/metro-runtime`. Remove unused heuristic IK.**

- [ ] **Step 4: `npm test` && `npm run type-check`**

- [ ] **Step 5: README status line. Commit** `feat: mount web 3D arm from IK joints`

---

## Self-review

Spec coverage: FK/IK API, MOVE fail, web viewer, Expo web deps, iOS fallback, tests, docs. No WPR, no expo-gl, no blending.
