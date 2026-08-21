# Realistic Work Cell Graphics

**Date:** 2026-08-21  
**Status:** Locked — user asked for graphics “as realistic as possible”  
**Repo:** `github.com/axelruiz21/Fanuc-IOS-APP-`  
**Branch:** extend `cursor/lrmate-ik-web-508a` / PR #2  
**Supersedes:** editorial-night §3.6 “quiet grid / soft studio lights” for the 3D viewport only. Pendant chrome stays editorial night.

---

## 1. Problem

The CAD arm is posed correctly, but the viewport still reads as a toy: white Grid overlay, circular studio disc, RoomEnvironment product-shot IBL, uniform yellow plastic, unlit debug floor. Students should see a small industrial cell.

---

## 2. Approaches

**A — In-engine factory cell (recommended).** Custom PMREM from a gray bay (no CDN HDR). Visible walls, overhead fixtures, steel pad, weld table, epoxy floor. Web: MeshReflectorMaterial + PCSS soft shadows. Native: same meshes, standard floor + contact shadows (no PCSS/reflector). Procedural DataTextures (no image assets). Box-projected UVs on STLs so paint can have orange-peel.

**B — CDN HDR + photogrammetry cell.** Breaks offline Expo / EAS; not allowed.

**C — Keep studio, add bloom/SSAO packages.** Still a void with a robot; extra native risk.

**Choice: A.**

---

## 3. Locked decisions

1. Renderer still does **not** call `inverse`. Posing stays `cadLinkTransform` / `jointTransforms`.
2. No new npm packages. drei 9 already has `MeshReflectorMaterial` and `SoftShadows`.
3. No CDN / no HDR files. IBL = `PMREMGenerator.fromScene` of a factory box with warm overheads and a cool window.
4. Drop the bright white `Grid`. Floor markings live in the concrete albedo (yellow safety square).
5. Keep RGB EOAT shafts at `link_6` (user-requested). Slight emissive so they read as LED indicators, not unlit gizmos.
6. FANUC paint stays yellow (`CAD_LINK_COLORS`); base dark metal; `link_6` machined dark metal. Automotive clearcoat, **no sheen** (sheen is cloth).
7. Web-only: PCSS `SoftShadows`, `MeshReflectorMaterial` (resolution ≤ 512), `RectAreaLight`. Native: PCF soft shadow map + contact shadows + standard floor.
8. Jest stays Node. Test procedural RGBA buffers, box UVs, and that the IBL scene graph disposes. No WebGL.
9. Out of scope: WPR, collision meshes, billed EAS, kinematics, CALL, logos/trademarks as bitmaps.

---

## 4. Architecture

```
proceduralMaps.ts     Uint8Array albedo / roughness / normal
factoryEnvironment.ts THREE.Scene for PMREM (dispose after bake)
stlShading.ts         applyBoxUVs on CAD BufferGeometry
RobotStudio.tsx       IBL bake, lights, renderer color space
WorkCell.tsx          floor, walls, fixtures, pad, table
CadLinkMaterial.tsx   meshPhysicalMaterial + shared DataTextures
CadArm.tsx            prepareCadGeometry (crease + UVs)
RobotArmCanvas.tsx    no Grid; WorkCell in world Y-up; CAD group Z-up
```

Floor and walls are **world Y-up**. CAD remains in the existing `rotation={[-π/2,0,0]}` group.

---

## 5. Tests

- `concreteAlbedo(n)` length `n*n*4`; grout darker than field; safety ring is yellow.
- `paintNormal(n)` is not a flat `(128,128,255)` everywhere.
- `applyBoxUVs` writes an `uv` attribute with `count === position.count`.
- `createFactoryEnvironmentScene().scene.children.length >= 5`; `dispose()` does not throw.
