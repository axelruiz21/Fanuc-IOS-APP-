# Web HDR, Post-Processing, and Lightly Used Paint

**Date:** 2026-08-21  
**Status:** Locked — user chose lighting+surface (B+C), web-first HDR+effects (A), lightly used paint  
**Repo:** `github.com/axelruiz21/Fanuc-IOS-APP-`  
**Branch:** extend `cursor/lrmate-ik-web-508a` / PR #2  
**Supersedes:** work-cell spec §3.2–3.3 for **web only** (those bullets forbade new packages and HDR files). Native still uses in-memory factory IBL. Cell dressing, STL replacement, IK, EOAT triad, and pendant chrome are unchanged.

---

## 1. Problem

The work cell is already a small factory bay with clearcoat yellow and an epoxy floor. The arm still reads as even plastic: one roughness, orange-peel only, and a low-frequency baked box for IBL. The Mac/browser can take a real HDR and a post stack; Expo-GL on a phone should not load that stack.

---

## 2. Approaches (locked)

| Option | Summary | Result |
| --- | --- | --- |
| **A — Vendored HDR + web post (chosen)** | CC0 warehouse HDR in-repo; N8AO/SMAA/bloom on web; wear maps on both platforms | Max Mac look; phone stays smooth |
| B — Maps only | No HDR file, no post package | Safer, still “real-time render” |
| C — Path tracing | Near-photo stills | Hitches when the arm moves |

---

## 3. What you see

**Mac / web**

- `machine_shop_01` 2K HDR from Polyhaven (CC0) is **environment lighting only**, not a skybox. The existing bay, floor, table, and fixtures stay.
- A directional key light still casts shadows (HDRI does not drive Three’s shadow map). Hemisphere/area fills drop so the HDR dominates reflections.
- Post: N8AO (joint contact), mild bloom on fixtures only, light vignette, SMAA last.
- SoftShadows + MeshReflectorMaterial stay.
- Paint: FANUC yellow, automotive clearcoat, micro-scratches, slightly duller “used” roughness. Base and `link_6` stay dark metal with faint fingerprints/brushing. No logos.

**iPhone / iPad**

- Same wear maps and clearcoat.
- Current factory `PMREMGenerator.fromScene` + current lights/contact shadows. No HDR texture, no EffectComposer.

**Unchanged**

- ROS-Industrial STLs, `cadLinkTransform` / `jointTransforms`, MOVE failure rules, RGB EOAT at `link_6`.
- No cables, cage, gripper, or mesh upgrade.
- If the GL tree throws, existing 2D `Viewport3D` fallback.

---

## 4. Architecture

```
assets/env/machine_shop_01_2k.hdr   vendored CC0 (offline)
assets/env/LICENSE + ATTRIBUTION.md
metro.config.js                     assetExts += hdr
app/types/assets.d.ts               declare '*.hdr'

app/viewer/proceduralMaps.ts        wear / scratch RGBA (Jest)
app/viewer/studioMaps.ts            DataTextures for both platforms

app/components/RobotEffects.web.tsx     N8AO + Bloom + Vignette + SMAA
app/components/RobotEffects.native.tsx  null
app/components/RobotStudio.tsx          web: RGBE → PMREM; native/fallback: factory scene
app/components/CadLinkMaterial.tsx      wear maps + clearcoat
app/components/RobotArmCanvas.tsx       mount <RobotEffects />
```

**HDR load (web):** same pattern as STL — `expo-asset` + arrayBuffer → `RGBELoader.parse` → `PMREMGenerator.fromEquirectangular` → `scene.environment`. Dispose the equirect texture after bake. Do **not** assign the HDR to `scene.background`.

**Fallback:** if HDR missing, parse fails, or PMREM throws, call `createFactoryEnvironmentScene()` (today’s path). Log a warning. Viewer still runs.

**Effects (web):** `@react-three/postprocessing` mounted only from `RobotEffects.web.tsx` so Metro does not put the composer in the native bundle. `RobotEffects.web` uses a local error flag: if composer init or first frame throws, render `null` (scene remains, no post). Do not add a second IK path.

**Lights (web):** keep one shadow-casting `directionalLight`. Lower hemisphere to ~0.12. Keep fixture meshes; dim `rectAreaLight` so they bloom without washing the HDR.

**Paint maps (both):**

- `paintNormal`: keep orange-peel; add sparse scratch streaks (anisotropic noise).
- `paintRoughness`: wider range (~0.22–0.55) so edges/panels look used, not dirty.
- `brushedMetalRoughness`: add blotchy higher-roughness “fingerprint” regions for `base_link` / `link_6`.
- Clearcoat stays ~1 / roughness ~0.12 on yellow; no cloth sheen.
- Colors stay `CAD_LINK_COLORS`.

**Packages:** add `@react-three/postprocessing` with `npx expo install` (pulls compatible `postprocessing`). Do not add path tracers or extra environment helpers that fetch CDNs.

**HDR file:** Polyhaven `machine_shop_01` 2K `.hdr` (CC0). If the 2K file exceeds ~20 MB, vendor the 1K instead. License text in `assets/env/LICENSE`. No runtime download.

---

## 5. Error handling

| Failure | Behavior |
| --- | --- |
| HDR asset URI missing / parse error | Factory IBL; console.warn |
| EffectComposer / N8AO unsupported | Canvas without post (native path is already this) |
| Entire Canvas throw | Existing `Viewport3D` 2D fallback |
| Native import of postprocessing | Must not happen — platform file split is the guard |

Renderer never calls `inverse`.

---

## 6. Tests (Jest Node, no WebGL)

- `paintNormal(size, { scratches })` defaults `scratches` to true. `paintNormal(n, { scratches: true })` is not byte-identical to `paintNormal(n, { scratches: false })`, and both still have >8 distinct RGB triples.
- `paintRoughness(n)` luma range is wider than a flat 0.30 (max−min ≥ 40 on 0–255).
- `brushedMetalRoughness(n)` is not a single gray.
- `assets/env/machine_shop_01_2k.hdr` (or `_1k.hdr` if size-capped) exists, size > 50 KB; `LICENSE` mentions CC0 or Polyhaven.
- `metro.config.js` includes `hdr` in `assetExts`.
- Existing kinematics / CAD / work-cell tests stay green.
- `npx tsc --noEmit` clean.

---

## 7. Out of scope

Cell dressing (cables, cage, gripper), STL remesh/GLB swap, path tracing, CDN environments, FANUC logo bitmaps, WPR, collision, billed EAS, changing native into a post-processing target.

---

## 8. Success

On Mac/web after `npx expo start --web --clear` and Cmd+Shift+R: yellow paint shows HDR highlights and fine scratches at the default camera; joint roots are darker than today; fixtures may glow slightly; the room is still our bay, not a warehouse photo. On a device, the arm has the same paint and the old lights, without hitching from a composer.
