# Native 3D Arm (expo-gl)

**Date:** 2026-08-16  
**Status:** Locked — same kinematics as web; renderer still does not solve IK  
**Repo:** `github.com/axelruiz21/Fanuc-IOS-APP-`  
**Branch:** extend `cursor/lrmate-ik-web-508a` / PR #2

---

## 1. Problem

Web already draws a 6-link LR Mate 200iD from `currentJoints`. iOS/Android still mount `Viewport3D` (2D XY blob). `RobotArm.native.tsx` is a stub that returns `null` so Metro does not load Three.

Students on a device never see the arm jump.

---

## 2. Approaches

**A — R3F native Canvas + expo-gl (recommended).** `@react-three/fiber` already has a `react-native` entry. Share the scene graph. Add `expo-gl`, `expo-asset`, `expo-file-system` (SDK 50 peers).

**B — Imperative Three.js in `GLView`.** More code, two scene graphs, easy to drift from web.

**C — WebView of the web canvas.** Not a native GL arm; extra WebView surface.

**Choice: A.** One `ArmModel` / `forwardFrames` path. No second IK.

---

## 3. Architecture

```
currentJoints (interpreter)
  → RobotArmViewer (web: R3F DOM Canvas; native: R3F expo-gl Canvas)
      → ArmModel from forwardFrames(joints)
```

| File | Role |
|------|------|
| `app/components/armLinks.ts` | Headless origins (mm) from `forwardFrames` — Jest |
| `app/components/RobotArmCanvas.tsx` | Shared R3F scene + Canvas |
| `app/components/FiberCanvas.native.tsx` | `Canvas` from `@react-three/fiber/native` |
| `app/components/FiberCanvas.tsx` / `.web.tsx` | `Canvas` from `@react-three/fiber` |
| `app/components/RobotArm.native.tsx` | Re-export canvas (no longer a null stub) |
| `app/App.tsx` | Mount `RobotArmViewer` on every platform |
| `Viewport3D` | Fallback only if the GL tree throws |

Kinematics stay headless. Native viewer **reads** `joints`; it never calls `inverse`.

---

## 4. Locked decisions

1. Same URDF chain / `forwardFrames` as web.
2. Jump pose, no blending.
3. Visual CAD STLs from ROS-Industrial LR Mate 200iD (base model). Cylinder `PrimitiveArm` if a mesh fails to load. No collision meshes.
4. Web: damped drei `OrbitControls`. Native: `PanResponder` + `app/viewer/orbit.ts` (rotate / pinch / pan). If GL init throws, show existing `Viewport3D`.
5. `expo-gl ~13.6` (Expo 50). EAS config is in-repo (`eas.json`); billed builds and store submit stay local to Axel.
6. Web smoke unchanged.

---

## 5. Testing

- `armOriginsMm(HOME_JOINTS)` starts at `[0,0,0]` and last point matches `forward(HOME_JOINTS)` XYZ within 1e-6.
- Existing 75 tests stay green. No WebGL in Jest.
- `tsc --noEmit` clean.

---

## 6. Out of scope

Collision meshes, billed `eas build` / store submit, Android-only GPU workarounds. CAD, orbit-gesture polish, and EAS config: see `2026-08-20-cad-orbit-eas-design.md`.
