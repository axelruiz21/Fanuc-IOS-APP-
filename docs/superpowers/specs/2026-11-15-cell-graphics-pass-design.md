# Cell Graphics Pass — lighting, materials, shadows, dressing, camera, post

**Date:** 2026-11-15  
**Status:** Implemented on web; native shares layout/materials, lighter rig  
**Repo:** `github.com/axelruiz21/Fanuc-IOS-APP-`  
**Supersedes:** the "no cell dressing / no reflector" constraints of `2026-08-21-realistic-work-cell-design.md` and `2026-08-21-web-hdr-wear-design.md` (user asked for all six axes to be raised).

---

## 1. Problem (measured on the pre-pass build)

- Camera targeted the floor at the base and cropped the elbow; 38° lens keystoned the CAD.
- Two shadow-casting directionals (one in `RobotArmCanvas`, one in `RobotStudio`) washed each other out; no readable arm shadow.
- Paint: clearcoat 1.0 / 0.12 under a bright HDR — wet plastic with blown highlights.
- Floor: flat diffuse plane; the reflector from the earlier spec was never shipped.
- Composer ran on an 8-bit buffer, so `Bloom` at threshold 1.15 could never fire.
- Cell: pedestal, table, two walls, three floating fixtures. Read as a box with a robot.

## 2. Decisions

| Axis | Decision |
|------|----------|
| Camera | `DEFAULT_ORBIT_TARGET` = working volume `[0.05, 0.42, -0.05]`, position `[1.35, 1.0, 2.0]`, `DEFAULT_FOV` 30. Web `OrbitControls` and native spherical orbit share the target. |
| Lighting | One rig in `StudioLights`: key (only shadow caster) at `[-1.5, 4.2, 2.4]` so the arm's shadow falls camera-right onto open floor; cool rim from behind-right; overhead spot pool from the pedestal fixture (physically-correct units, 28 cd web / 16 native); rect-area strips on every fixture (web). IBL supplies ambient; hemisphere is a 0.06 seasoning. |
| Shadows | PCSS `samples 16 / size 5 / focus 0.5` on web, PCF on native; `ContactShadows` on both platforms for grounding; 2048 map web / 1024 native. |
| Materials | Powder-coat yellow: dielectric, roughness from the wear map, clearcoat 0.45 / 0.32, `envMapIntensity` 0.8. Base: matte painted cast (not chrome). Flange: brushed aluminium. Table slugs: satin alu kept under the bloom threshold. |
| Floor | Web: `MeshReflectorMaterial` (res 512, mirror 0.25, blur 480×160) with the concrete roughness map so tape reflects sharper than field. Native: standard PBR floor. |
| Dressing | `app/viewer/cellLayout.ts` (headless, tested): L-shaped guard fence with graphite posts, yellow rails and welded-mesh cutout panels; controller cabinet with status LEDs; dress cable (Catmull-Rom tube) from a base connector to the cabinet; two bollards on the open side; ceiling beams carrying the fixtures; parts on the table; a tote. No logos, no gripper (TCP stays the triad). |
| Post | Half-float composer → `N8AO` (0.22 m, medium, half-res) → `Bloom` 1.15 / 0.35 → ACES → `Vignette` → `SMAA`. Native: none. |

## 3. Verification

`scripts/web-shot.mjs` drives headless Chrome over CDP (real GPU, visible document) and captures the web build; `PRE_JS` can click Lesson 1 → Play before the shot. Use it instead of an embedded browser pane: a hidden pane pauses rAF and ResizeObserver, so an R3F canvas there never mounts or renders and looks exactly like a shader bug.

Headless tests: `tests/cellLayout.test.ts` (keep-out, fence geometry, cable endpoints, bollards outside the tape), `tests/orbit.test.ts` (hero framing), `tests/proceduralMaps.test.ts` (wire-mesh cutout), `tests/envAssets.test.ts` (reflector web-only, half-float composer).

## 4. Out of scope

Native validation on a physical device, EOAT gripper, WPR, kinematics, EAS builds, logos.
