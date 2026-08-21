# Realistic Work Cell Implementation Plan

> **For agentic workers:** Implement in this session. Jest is Node-only (no WebGL). Graphics components are verified with `tsc` plus headless unit tests.

**Goal:** Replace the studio disc + white grid with an industrial work cell and physically based FANUC paint, without changing IK or orbit math.

**Architecture:** Pure procedural maps and box UVs (Jest). Factory `THREE.Scene` baked to PMREM at runtime. Visible cell meshes in world Y-up. CAD group stays Z-up.

**Tech Stack:** Expo 50, R3F 8, drei 9, three 0.160, Jest 29 (Node).

## Global Constraints

- Do not rewrite kinematics. Renderer never calls `inverse`.
- No new dependencies. No CDN HDR. No billed EAS.
- Jest stays Node — no WebGL in tests.
- Stay on `cursor/lrmate-ik-web-508a`; extend PR #2.
- RGB EOAT triad stays.

---

### Task 1: Headless maps / UVs / IBL scene

**Files:** `app/viewer/proceduralMaps.ts`, `app/viewer/stlShading.ts`, `app/viewer/factoryEnvironment.ts`, matching tests.

- [x] Failing tests, then implementation, then `npx jest` on those files.

### Task 2: Viewport cell + materials

**Files:** `app/components/WorkCell.tsx`, `RobotStudio.tsx`, `CadLinkMaterial.tsx`, `CadArm.tsx`, `RobotArmCanvas.tsx`, `PrimitiveArm.tsx`.

- [x] Web: reflector floor + SoftShadows. Native: standard floor + ContactShadows.
- [x] `npx tsc --noEmit` and full `npx jest`.
