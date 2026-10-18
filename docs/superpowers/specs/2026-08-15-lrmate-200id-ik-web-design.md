# LR Mate 200iD Inverse Kinematics (Web First)

**Date:** 2026-08-15  
**Status:** Draft for user review (architecture, MOVE/IK contract, viewer, and tests approved in brainstorming)  
**Repo:** `github.com/axelruiz21/Fanuc-IOS-APP-`  
**Audience:** Implementers adding real 6-DOF IK and a web 3D arm after the MVP repair

---

## 1. Problem

The repaired MVP runs `MOVE P[n]` as an XYZ teleport. `RobotArm.tsx` is unused, uses web R3F on a native-named file, and maps pose to joints with an atan2 heuristic that does not put the tip on `P[n]`. `Viewport3D` is a 2D projection. Expo web cannot start (`react-native-web` / `react-dom` missing).

Students cannot see a FANUC-like arm reach a taught point, and MOVE cannot fail when the point is outside the work envelope.

This slice is the first production-grade sub-project (native 3D was deferred: **web first**, iOS GL later). Later queued slices: teach/learn loop, interpreter hardening (`CALL`, nested IF), pendant UX, ship path.

---

## 2. Locked decisions

1. **6-DOF FANUC-like IK**, not a 4-link teaching heuristic.
2. **Geometry:** FANUC **LR Mate 200iD** base model (not /7L, /4S). Source of truth: ROS-Industrial `lrmate200id.urdf` (manual B-83494EN/03).
3. **Unreachable or singular → MOVE fails.** Last valid `currentPosition` and `currentJoints` stay. Clear error. No clamp, no nearby-wrist fudge.
4. **IK in the execution path.** `FANUCInterpreter` calls a headless solver. The renderer does not decide success.
5. **Web first.** DOM `@react-three/fiber` `Canvas`. No `expo-gl` in this slice.
6. **iOS later.** Same kinematics module. This slice keeps `Viewport3D` on non-web platforms.
7. **Analytic Pieper IK** (spherical wrist), not Jacobian iteration.
8. **Pose type stays `Position`:** mm + degrees. `rx, ry, rz` are **XYZ Euler (RPY)**, not FANUC WPR. Document that in README.
9. **On success, joints jump** to the IK solution. No Cartesian or joint-space blending in this slice.
10. **No CAD meshes, collision, or CALL.** Cylinders/boxes from DH offsets only.

---

## 3. Architecture

```
MOVE P[n]
  → FANUCInterpreter.executeMOVE
      → kinematics.inverse(target, currentJoints)
           ok  → currentJoints, currentPosition = target
           err → success:false, state unchanged
  → store snapshots interpreterState
  → web: RobotArmViewer(joints)
      → forward kinematics / stored joints draw 6 links
  → native: Viewport3D (existing 2D fallback)
```

| Unit | Responsibility | Depends on |
|------|----------------|------------|
| `app/kinematics/lrmate200id.ts` | DH/URDF offsets, joint limits, home joints | none |
| `app/kinematics/solve.ts` | `forward`, `inverse` | DH |
| `app/kinematics/index.ts` | Public exports | solve + DH |
| `app/utils/interpreter.ts` | MOVE calls `inverse`; holds `currentJoints` | kinematics |
| `app/components/RobotArm.tsx` | Web R3F scene from `joints` | kinematics types only |
| `app/App.tsx` | Web → `RobotArmViewer`; else `Viewport3D` | store |

Kinematics must not import React, Three, or React Native. Jest runs FK/IK in Node.

---

## 4. Geometry (LR Mate 200iD)

Serial chain from ROS-Industrial `lrmate200id.urdf` (meters). Implement FK as this chain (parent→child origins + revolute axes), not an invented DH table that disagrees with the URDF.

| Joint | Origin XYZ (m) | Axis | Limits (rad) |
|-------|----------------|------|----------------|
| J1 | `0, 0, 0.330` | `0, 0, 1` | ±2.96706 (~±170°) |
| J2 | `0.050, 0, 0` | `0, 1, 0` | −1.74533 .. 2.53073 |
| J3 | `0, 0, 0.330` | `0, −1, 0` | −1.22173 .. 3.57792 |
| J4 | `0, 0, 0.035` | `−1, 0, 0` | ±3.31613 |
| J5 | `0.335, 0, 0` | `0, −1, 0` | ±2.18166 |
| J6 | `0.080, 0, 0` | `−1, 0, 0` | ±6.28319 |

Wrist center is at the J4/J5/J6 intersection implied by this chain (spherical wrist). Reach class ~717 mm from J1 axis; tests use a point with horizontal distance **> 900 mm** as `unreachable`.

**Home joints:** `[0, 0, 0, 0, 0, 0]` (URDF zeros). If the mesh would intersect the floor visually, still use zeros in the solver; the scene camera/grid may be offset so the base sits on the grid.

---

## 5. Kinematics API

```typescript
export type Joints = [number, number, number, number, number, number]; // J1..J6 radians

export type IkFailureReason = 'unreachable' | 'singular' | 'joint_limit';

export type IkResult =
  | { ok: true; joints: Joints }
  | { ok: false; reason: IkFailureReason };

export function forward(joints: Joints): Position
export function inverse(target: Position, seed: Joints): IkResult
```

`Position` is the existing interpreter type: `{ x, y, z, rx, ry, rz }` with **x,y,z in mm** and **rx,ry,rz in degrees**.

**RPY:** rotation matrix `R = Rz(rz) * Ry(ry) * Rx(rx)` with angles in radians internally. Tool frame = that orientation at the flange (J6 origin).

**`forward`:** apply the URDF chain; return tool pose in mm/deg.

**`inverse`:**
1. Build target rotation from RPY and wrist-center position (subtract flange offset along tool Z / J6 axis per the chain).
2. If wrist-center distance from J1 axis is outside the J2–J3 reach annulus → `{ ok: false, reason: 'unreachable' }`.
3. If the wrist is singular (`|J5| < 1e-3` rad for all otherwise-valid solutions, or the geometric test that J4/J6 axes are parallel) → `{ ok: false, reason: 'singular' }`.
4. Enumerate Pieper solutions (elbow/shoulder/wrist combinations, up to 8).
5. Discard solutions outside joint limits → if any geometric solution existed but all failed limits → `{ ok: false, reason: 'joint_limit' }`.
6. Among remaining, pick **minimum** `sum_i wrapPi(q[i] - seed[i])^2`.
7. Return `{ ok: true, joints }`.

Do not return a perturbed J5 to escape singularity.

---

## 6. Interpreter MOVE

`InterpreterState` adds:

```typescript
currentJoints: Joints
```

Initialize and `reset()` to home `[0,0,0,0,0,0]`. `getState()` clones the tuple (new array).

`executeMOVE`:
1. Parse `P[n]`, bounds 1–100 as today.
2. `target = this.state.positions[n]`.
3. `ik = inverse(target, this.state.currentJoints)`.
4. If `!ik.ok`: throw `MOVE ${ik.reason}` (existing `executeLine` wraps as `Line {pc}: ...`). Do not mutate position or joints.
5. If ok: `currentJoints = ik.joints`, `currentPosition = { ...target }`, log includes `J1..J6` in degrees rounded to 1 decimal.

`J` and `L` motion commands use the same IK path as `MOVE` (still a jump). Speed tokens stay cosmetic in the log.

Store: no new actions. `interpreterState` snapshot already includes new fields once `getState()` returns them. Seeded `P[1]`/`P[2]` must remain **reachable** (current 100/200/300 mm and 150/250/350 mm are inside 717 mm — verify in tests; if a seed is unreachable, change seeds to a documented reachable pose such as `P[1] = { x: 400, y: 0, z: 400, rx: 180, ry: 0, rz: 0 }` only if FK+IK tests require it). Prefer keeping existing seeds if IK succeeds; if not, update seeds and the default-program tests in the same change.

---

## 7. Web viewer

**`RobotArmProps`:**

```typescript
interface RobotArmProps {
  joints: Joints;
  currentPosition?: Position | null;
}
```

Remove unused `animated` and heuristic `calculateJointAngles`.

**Scene:** `Canvas` from `@react-three/fiber` (web). Ambient + directional light, grid, RGB axes, six links as cylinders along the URDF origins, end-effector at FK tip. `OrbitControls` from drei. No `@react-three/postprocessing`.

**App.tsx:** `Platform.OS === 'web' ? <RobotArmViewer joints={interpreterState.currentJoints} currentPosition={interpreterState.currentPosition} /> : <Viewport3D currentPosition={...} isLoading={false} />` in both layouts.

**Expo web:** add `react-native-web@~0.19.6`, `react-dom@18.2.0`, `@expo/metro-runtime`. `package.json` `start:web` must resolve. Root `App.tsx` re-export stays.

**`RobotArm.web.tsx`:** delete or make it re-export `RobotArm.tsx` so Metro does not pick a 2D canvas on web. Web must use the 3D component.

---

## 8. Error handling

| Case | Result |
|------|--------|
| IK unreachable | `success: false`, `error` contains `unreachable`, state unchanged |
| IK singular | `error` contains `singular`, state unchanged |
| IK joint_limit | `error` contains `joint_limit`, state unchanged |
| Persistence / GL | Unrelated; persistence already logs and continues |

UI: existing `lastError` on `ExecutionControls`. No 3D text overlay.

---

## 9. Testing

Jest Node tests in `tests/kinematics.test.ts` and extensions to `tests/interpreter.test.ts`. No WebGL.

| Test | Expect |
|------|--------|
| `forward(home)` is finite XYZ | z ≈ 330+330+35+80 mm along the chain at zeros — **assert the exact FK of zeros from the implementation and freeze it** (golden value computed once from `forward([0,0,0,0,0,0])`) |
| Round-trip | `q` inside limits, `p = forward(q)`, `inverse(p, q)` ok, each joint within 1e-3 rad of some wrapped equivalent of `q` **or** of another valid solution whose FK tip error &lt; 1 mm |
| Tip error | after successful `inverse`, `hypot(forward(q).x - p.x, ...)` &lt; 1 mm |
| Unreachable | `inverse({ x: 2000, y: 0, z: 0, rx: 180, ry: 0, rz: 0 }, home)` → `unreachable` |
| Singular | construct a pose that requires J5 ≈ 0 (document the pose in the test); `reason === 'singular'` |
| MOVE reachable | definePosition + `MOVE P[1]` success, `currentJoints` defined |
| MOVE unreachable | definePosition far point, MOVE fails, `currentPosition` still previous |

Existing 29 tests must stay green (update seeds only if required by §6).

---

## 10. Documentation

- `README.md` status: web 3D is LR Mate 200iD IK; iOS viewport remains 2D; `rx,ry,rz` are RPY not WPR; CALL still unimplemented.
- Do not claim CAD-accurate FANUC or native iOS 3D.

---

## 11. Success criteria

1. `npm test` and `npm run type-check` pass.
2. `inverse(forward(q))` meets the round-trip / 1 mm rules above.
3. MOVE fails on unreachable/singular/joint_limit without moving state.
4. On web, `App` mounts `RobotArmViewer` driven by `currentJoints`.
5. On non-web, `Viewport3D` still mounts.
6. Expo web dependencies are declared so `expo start --web` can resolve modules (actual GPU smoke test is best-effort in CI).
7. Kinematics module has zero React/Three imports.

---

## 12. Out of scope

- `expo-gl` / `@react-three/fiber/native`
- FANUC WPR, joint-space interpolation, `J`/`L` real speed
- Nested IF, CALL, teach-P[n] UI, syntax highlighting
- Official FANUC meshes, collision, singularities other than wrist (document shoulder/elbow as `unreachable` or `joint_limit` via the same failure reasons)
- App Store / EAS

---

## 13. Spec self-review

- No TBD placeholders. Golden FK-at-zeros is “compute once and freeze in the test,” not an unspecified number in this doc.
- Architecture matches MOVE-calls-IK and web-only Canvas.
- Scope is one slice: kinematics + MOVE + web viewer + Expo web deps.
- Ambiguities locked: RPY not WPR; fail not clamp; Pieper not numeric; 200iD URDF chain; jump not blend.
