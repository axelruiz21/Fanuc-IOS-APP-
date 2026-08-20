# CAD Meshes, Orbit Gestures, and EAS

**Date:** 2026-08-20  
**Status:** Locked — user brought CAD, orbit-gesture polish, and EAS into scope on PR #2  
**Repo:** `github.com/axelruiz21/Fanuc-IOS-APP-`  
**Branch:** extend `cursor/lrmate-ik-web-508a` / PR #2

---

## 1. Problem

Native and web 3D already pose a 6-link cylinder arm from `currentJoints`. Three items were deferred and are now required:

1. **CAD** — ROS-Industrial LR Mate 200iD visual meshes instead of cylinders.
2. **Orbit polish** — damping / distance clamps on web; 1-finger rotate, pinch zoom, two-finger pan on native (drei `OrbitControls` is weak on touch).
3. **EAS** — real bundle IDs, `eas.json` profiles, and README so Axel can `eas init` / `eas build` locally. This slice does **not** run a billed cloud build or App Store submit.

Kinematics stay frozen. The renderer still does not call `inverse`.

---

## 2. Approaches

### CAD

**A — Vendor ROS-Industrial visual STLs (recommended).** Identity visual origin per link in `lrmate200id_macro.xacro`. Pose each mesh with `jointTransforms` (base = identity). BSD license; copy LICENSE + attribution.

**B — Convert to GLB.** Smaller / faster, extra toolchain, easy to drift from upstream.

**C — Fetch at runtime.** Breaks offline Expo Go / EAS bundles.

**Choice: A.** Collision STLs stay out.

### Orbit

**A — Shared spherical orbit math + platform drivers (recommended).** Headless `orbit.ts` (Jest). Web: drei `OrbitControls` with damping and min/max distance. Native: `PanResponder` on the wrapper View driving the camera from the same math.

**B — drei OrbitControls everywhere.** Already shipped; native touch remains poor.

**C — Second IK / camera-follow-tip.** Out of scope; JUMP pose unchanged.

**Choice: A.**

### EAS

**A — Config in repo, no fake projectId, no billed build (recommended).** `eas.json` (`development` / `preview` / `production`), `ios.bundleIdentifier` + `android.package`, drop the placeholder `extra.eas.projectId`, document `eas init`. Add `expo-dev-client` so the development profile is valid.

**B — Invent an EAS UUID.** Wrong; `eas init` after Expo login creates it.

**C — Run `eas build` from this agent.** Billed; no Apple/Google credentials here.

**Choice: A.**

---

## 3. Architecture

```
currentJoints
  → RobotArmViewer
      → CadArm: STL at cadLinkTransform(joints, linkId)
      → fallback PrimitiveArm (cylinders) if a mesh fails to load
      → web: drei OrbitControls (damping, clamps)
      → native: PanResponder → orbit.ts → camera lookAt
```

| Unit | Responsibility |
|------|----------------|
| `app/viewer/cadFrames.ts` | Link id → `Mat4` (base identity, `link_i` = `jointTransforms()[i-1]`). Headless. |
| `app/viewer/orbit.ts` | Spherical yaw/pitch/radius/target. Headless. |
| `app/components/CadArm.tsx` | Load vendored STLs; apply frames; FANUC materials. |
| `app/components/OrbitCapture.native.tsx` | Touch: rotate / pinch / pan. |
| `app/components/OrbitDriver.native.tsx` | `useFrame` writes camera from orbit state. |
| `app/components/OrbitDriver.tsx` | Web `OrbitControls`. |
| `eas.json` + `app.json` | Build profiles and store identifiers. |

URDF visuals are identity in the link frame (`origin xyz="0 0 0" rpy="0 0 0"`). Meshes are meters (same as `CHAIN`). Scene group stays `rotation={[-π/2, 0, 0]}` (Z-up URDF in Y-up Three).

`Mat4` is row-major. Three `Matrix4.set` takes row-major args; use `mat4ToThreeSetArgs`.

Materials (ROS-I `common_colours.xacro`):

- base_link: gray28 `#474747`
- link_1 … link_5: yellow `rgb(0.96, 0.76, 0.13)`
- link_6: black `rgb(0.15, 0.15, 0.15)`

---

## 4. Locked decisions

1. Visual STLs only from `fanuc_lrmate200id_support` **base** model (not /7L, /4S). Source: `noetic-devel` `meshes/lrmate200id/visual/{base_link,link_1..link_6}.stl`.
2. `link_1` → `jointTransforms(joints)[0]` … `link_6` → `[5]`. `base_link` → identity. Visual origin is identity (no extra offset).
3. Renderer never calls `inverse`. Jump pose, no blending.
4. Mesh load failure → existing cylinder `PrimitiveArm`. Loading may show primitives until CAD is ready.
5. Metro `assetExts` includes `stl`. Load via `expo-asset` + `STLLoader.parse(ArrayBuffer)`.
6. Web orbit: damping on, `minDistance` 0.4 m, `maxDistance` 8 m, pan + rotate + zoom. Default camera `[1.5, 1.1, 1.5]` looking at origin.
7. Native orbit: 1-finger rotate, pinch-out zooms in (`radius /= factor`), two-finger midpoint pans in the camera plane. Pitch clamped; radius clamped to the same 0.4–8 m.
8. Bundle IDs: `com.axelruiz.fanucpendant` (iOS and Android). No invented EAS `projectId`.
9. `eas.json` profiles: `development` (`developmentClient: true`, `distribution: internal`, iOS `simulator: true`), `preview` (`distribution: internal`), `production` (`{}`). No CI EAS credentials. No App Store submit from this slice.
10. Add `.gitignore` so EAS/local builds do not upload `node_modules`, `.expo`, or signing secrets.
11. Fix invalid Expo iOS keys (`supportsTabletMode` → `supportsTablet`). Keep landscape.

---

## 5. Testing

Jest stays Node. No WebGL / R3F in tests.

- `cadLinkOriginMm(HOME_JOINTS, 'base_link')` is `[0,0,0]`.
- `cadLinkOriginMm(joints, 'link_6')` matches `forward(joints)` XYZ within 1e-6 (meters→mm).
- `CAD_LINK_FRAME_INDEX.link_1 === 0` … `link_6 === 5`; `base_link` is `null` (identity).
- Orbit: `cameraPosition(orbitFromCameraPosition([1.5,1.1,1.5]))` round-trips; pitch/radius clamp; pinch-out decreases radius; pan does not change radius.
- Vendored `assets/lrmate200id/visual/*.stl` exist.
- `eas.json` has the three profiles; `app.json` has both package IDs and no fake `extra.eas.projectId`.
- Existing tests stay green. `tsc --noEmit` clean.

---

## 6. Out of scope

Collision meshes, GLB conversion, billed `eas build` / EAS Submit, App Store / Play upload, a real EAS project UUID (created by `eas init` on Axel’s machine), camera-follow-tool, second IK, Android GPU workarounds.

---

## 7. Attribution

Vendored meshes and the BSD license text come from [ros-industrial/fanuc](https://github.com/ros-industrial/fanuc) (`noetic-devel`), originally TU Delft Robotics Institute. See `assets/lrmate200id/LICENSE` and `ATTRIBUTION.md`.
