# Web HDR, Post-Processing, and Lightly Used Paint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On Mac/web, light the existing work-cell CAD arm with a vendored machine-shop HDR and a small post stack (N8AO, mild bloom, vignette, SMAA), and give the yellow paint micro-scratches and used roughness on every platform.

**Architecture:** Procedural wear maps stay headless (Jest). Web loads `assets/env/machine_shop_01_2k.hdr` via expo-asset + `RGBELoader`, bakes PMREM, and sets `scene.environment` only (not background). Native never imports `@react-three/postprocessing` (`RobotEffects.tsx` vs `RobotEffects.native.tsx`, same pattern as `OrbitCapture`). HDR or composer failure falls back to today’s factory IBL / no post. Renderer never calls `inverse`.

**Tech Stack:** Expo 50, R3F 8, drei 9, three 0.160, `@react-three/postprocessing` (Expo-aligned), Jest 29 (Node).

## Global Constraints

- Do not rewrite kinematics. Renderer never calls `inverse`.
- LR Mate 200iD visual STLs stay. No cell dressing (cables, cage, gripper). No FANUC logos.
- RGB EOAT triad at `link_6` stays.
- HDR is environment lighting only — do not assign it to `scene.background`.
- Native: factory `PMREMGenerator.fromScene` + current contact shadows; no EffectComposer.
- Jest stays Node — no WebGL in tests.
- No CDN at runtime. No billed EAS.
- Stay on `cursor/lrmate-ik-web-508a`; extend PR #2.
- `rx,ry,rz` XYZ Euler RPY unchanged. MOVE failure rules unchanged.

## File map

| File | Role |
| --- | --- |
| `app/viewer/proceduralMaps.ts` | Scratch normals, wider paint roughness, metal fingerprints |
| `tests/proceduralMaps.test.ts` | Headless map contracts |
| `assets/env/machine_shop_01_2k.hdr` | Vendored Polyhaven CC0 2K HDR (~6.7 MB) |
| `assets/env/LICENSE`, `assets/env/ATTRIBUTION.md` | CC0 provenance |
| `metro.config.js`, `app/types/assets.d.ts` | `.hdr` as an asset |
| `tests/envAssets.test.ts` | HDR file + metro `hdr` ext |
| `app/components/CadLinkMaterial.tsx` | Slightly stronger wear read on existing maps |
| `app/components/RobotEffects.tsx` | Web composer (default / web bundle) |
| `app/components/RobotEffects.native.tsx` | `null` — native must not import postprocessing |
| `app/components/RobotArmCanvas.tsx` | Mount `<RobotEffects />` |
| `app/components/RobotStudio.tsx` | Web HDR bake + factory fallback; dim web fills |
| `package.json` | `@react-three/postprocessing` (+ `postprocessing` peer) |

---

### Task 1: Lightly used paint maps

**Files:**
- Modify: `app/viewer/proceduralMaps.ts`
- Modify: `tests/proceduralMaps.test.ts`
- Modify: `app/components/CadLinkMaterial.tsx`

**Interfaces:**
- Consumes: existing `pixelIndex`, `paintNormal`, `paintRoughness`, `brushedMetalRoughness`.
- Produces:

```ts
export type PaintNormalOptions = { scratches?: boolean };
export function paintNormal(size: number, opts?: PaintNormalOptions): Uint8Array;
export function paintRoughness(size: number): Uint8Array;
export function brushedMetalRoughness(size: number): Uint8Array;
```

`scratches` defaults to true so `paintNormal(size)` stays valid. `getStudioMaps()` already calls `paintNormal(PAINT_SIZE)` and needs no signature change.

- [ ] **Step 1: Write the failing tests**

Append to `tests/proceduralMaps.test.ts` (keep the existing four cases):

```ts
it('adds a scratch layer that changes the normal map', () => {
  const withScratch = paintNormal(SIZE, { scratches: true });
  const without = paintNormal(SIZE, { scratches: false });
  expect(Buffer.from(withScratch).equals(Buffer.from(without))).toBe(false);
});

it('keeps both scratch modes as non-flat normals', () => {
  for (const scratches of [true, false]) {
    const nrm = paintNormal(SIZE, { scratches });
    const seen = new Set<string>();
    for (let i = 0; i < nrm.length; i += 4) {
      seen.add(`${nrm[i]},${nrm[i + 1]},${nrm[i + 2]}`);
      if (seen.size > 8) break;
    }
    expect(seen.size).toBeGreaterThan(8);
  }
});

it('spreads paint roughness instead of a flat 0.30', () => {
  const data = paintRoughness(SIZE);
  let min = 255;
  let max = 0;
  for (let i = 0; i < data.length; i += 4) {
    min = Math.min(min, data[i]);
    max = Math.max(max, data[i]);
  }
  expect(max - min).toBeGreaterThanOrEqual(40);
});

it('does not emit a single gray for brushed metal', () => {
  const data = brushedMetalRoughness(SIZE);
  const seen = new Set<number>();
  for (let i = 0; i < data.length; i += 4) {
    seen.add(data[i]);
    if (seen.size > 4) break;
  }
  expect(seen.size).toBeGreaterThan(4);
});
```

- [ ] **Step 2: Run tests and confirm the scratch case fails**

Run: `npx jest tests/proceduralMaps.test.ts --no-coverage`

Expected: `adds a scratch layer` FAIL (`opts` unused / second arg ignored). Other new tests may already pass; still implement the spec ranges in Step 3.

- [ ] **Step 3: Implement maps + material tweak**

Replace `paintNormal` in `app/viewer/proceduralMaps.ts` with:

```ts
export type PaintNormalOptions = { scratches?: boolean };

export function paintNormal(size: number, opts: PaintNormalOptions = {}): Uint8Array {
  const scratches = opts.scratches !== false;
  const data = alloc(size);
  const strength = 1.6;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x + 0.5) / size;
      const v = (y + 0.5) / size;
      const eps = 1 / size;
      const height = (uu: number, vv: number): number => {
        let h = fbm(uu * 28, vv * 28, 63);
        if (scratches) {
          const streak = valueNoise(uu * 72, vv * 9, 201);
          h += Math.max(0, streak - 0.84) * 1.8;
        }
        return h;
      };
      const nx = (height(u - eps, v) - height(u + eps, v)) * strength;
      const ny = (height(u, v - eps) - height(u, v + eps)) * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      const i = pixelIndex(size, x, y);
      data[i] = clampByte(((nx / len) * 0.5 + 0.5) * 255);
      data[i + 1] = clampByte(((ny / len) * 0.5 + 0.5) * 255);
      data[i + 2] = clampByte(((nz / len) * 0.5 + 0.5) * 255);
      data[i + 3] = 255;
    }
  }
  return data;
}
```

In `paintRoughness`, use:

```ts
const speckle = fbm(u * 18, v * 18, 77);
const wear = fbm(u * 5.5, v * 5.5, 91);
const c = clampByte((0.22 + speckle * 0.18 + wear * 0.15) * 255);
```

In `brushedMetalRoughness`, after `stroke`:

```ts
const blotch = fbm(u * 5, v * 5, 131);
const fingerprint = blotch > 0.62 ? 0.2 : 0;
const c = clampByte((0.22 + stroke * 0.35 + fingerprint) * 255);
```

In `app/components/CadLinkMaterial.tsx` yellow branch only: `clearcoatRoughness={0.12}`, `PAINT_NORMAL_SCALE = new THREE.Vector2(0.28, 0.28)`, `envMapIntensity={1.15}`. Do not add sheen. Do not change `CAD_LINK_COLORS`.

- [ ] **Step 4: Re-run map tests**

Run: `npx jest tests/proceduralMaps.test.ts --no-coverage`

Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add app/viewer/proceduralMaps.ts tests/proceduralMaps.test.ts app/components/CadLinkMaterial.tsx
git commit -m "feat: lightly used paint maps with scratches and wear"
```

---

### Task 2: Vendor machine-shop HDR and teach Metro `.hdr`

**Files:**
- Create: `assets/env/machine_shop_01_2k.hdr`
- Create: `assets/env/LICENSE`
- Create: `assets/env/ATTRIBUTION.md`
- Modify: `metro.config.js`
- Modify: `app/types/assets.d.ts`
- Create: `tests/envAssets.test.ts`

**Interfaces:**
- Consumes: `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/machine_shop_01_2k.hdr` (HTTP 200, Content-Length **7004194**, under the spec 20 MB cap — vendor 2K, do not use 1K).
- Produces: Expo asset module id `require('../../assets/env/machine_shop_01_2k.hdr')` typed as `number`.

- [ ] **Step 1: Write the failing test**

Create `tests/envAssets.test.ts`:

```ts
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const ENV = path.join(ROOT, 'assets/env');

describe('vendored machine-shop HDR', () => {
  it('ships a CC0 HDR larger than 50 KB plus a license', () => {
    const hdr = path.join(ENV, 'machine_shop_01_2k.hdr');
    expect(fs.existsSync(hdr)).toBe(true);
    expect(fs.statSync(hdr).size).toBeGreaterThan(50_000);
    const license = fs.readFileSync(path.join(ENV, 'LICENSE'), 'utf8');
    expect(/CC0|Polyhaven|Poly Haven/i.test(license)).toBe(true);
  });

  it('registers hdr as a Metro asset extension', () => {
    const src = fs.readFileSync(path.join(ROOT, 'metro.config.js'), 'utf8');
    expect(src).toContain("'hdr'");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/envAssets.test.ts --no-coverage`

Expected: FAIL — `assets/env` missing and metro has no `hdr`.

- [ ] **Step 3: Download HDR, write license, patch Metro**

```bash
mkdir -p assets/env
curl -L --fail -o assets/env/machine_shop_01_2k.hdr \
  "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/2k/machine_shop_01_2k.hdr"
```

Expected: file size about 7004194 bytes.

`assets/env/LICENSE`:

```
CC0 1.0 Universal (CC0 1.0) Public Domain Dedication

machine_shop_01 HDRI from Poly Haven
https://polyhaven.com/a/machine_shop_01
https://creativecommons.org/publicdomain/zero/1.0/

No copyright is claimed on this HDRI. This project vendors a 2K Radiance
(.hdr) copy for offline Expo / EAS bundles. Do not fetch it from a CDN
at runtime.
```

`assets/env/ATTRIBUTION.md`:

```
# machine_shop_01

Vendored from Poly Haven (CC0):
https://polyhaven.com/a/machine_shop_01

File: machine_shop_01_2k.hdr (2K Radiance HDR, environment lighting only).
```

Replace `metro.config.js` with:

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const { assetExts, sourceExts } = config.resolver;

config.resolver.assetExts = Array.from(new Set([...(assetExts || []), 'stl', 'hdr']));
config.resolver.sourceExts = (sourceExts || []).filter((ext) => ext !== 'stl' && ext !== 'hdr');

module.exports = config;
```

Append to `app/types/assets.d.ts`:

```ts
declare module '*.hdr' {
  const src: number;
  export default src;
}
```

- [ ] **Step 4: Re-run env tests**

Run: `npx jest tests/envAssets.test.ts --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add assets/env metro.config.js app/types/assets.d.ts tests/envAssets.test.ts
git commit -m "feat: vendor Polyhaven machine_shop_01 HDR for offline IBL"
```

The `.hdr` binary must be in git. `.gitignore` does not exclude it.

---

### Task 3: Web-only post stack

**Files:**
- Create: `app/components/RobotEffects.tsx`
- Create: `app/components/RobotEffects.native.tsx`
- Modify: `app/components/RobotArmCanvas.tsx`
- Modify: `package.json` / lockfile via install
- Modify: `tests/envAssets.test.ts`

**Interfaces:**
- Consumes: `@react-three/postprocessing` `EffectComposer`, `N8AO`, `Bloom`, `Vignette`, `SMAA`.
- Produces: `export function RobotEffects(): React.ReactElement | null`
- Native file must not contain `@react-three/postprocessing`.
- Resolve pattern: `RobotEffects.tsx` (web/default) + `RobotEffects.native.tsx`, same as `OrbitCapture.tsx`.

- [ ] **Step 1: Install the package**

Run: `npx expo install @react-three/postprocessing`

Expected: `package.json` lists `@react-three/postprocessing` and `postprocessing`. If Expo has no version map, install `@react-three/postprocessing@2.16.3` and `postprocessing@6.35.3` (three 0.160 / r3f 8 / drei 9).

- [ ] **Step 2: Write a failing native-guard test**

Add to `tests/envAssets.test.ts`:

```ts
it('keeps postprocessing out of the native effects file', () => {
  const native = fs.readFileSync(
    path.join(ROOT, 'app/components/RobotEffects.native.tsx'),
    'utf8'
  );
  expect(native).not.toContain('@react-three/postprocessing');
  expect(native).toContain('return null');
});
```

Run: `npx jest tests/envAssets.test.ts --no-coverage`

Expected: FAIL — `RobotEffects.native.tsx` missing.

- [ ] **Step 3: Implement effects + mount**

`app/components/RobotEffects.native.tsx`:

```tsx
import React from 'react';

/** Native Expo-GL must not load the web post stack. */
export function RobotEffects(): null {
  return null;
}
```

`app/components/RobotEffects.tsx`:

```tsx
import React, { Component, useState, type ErrorInfo, type ReactNode } from 'react';
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from '@react-three/postprocessing';

class EffectsBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.warn('RobotEffects disabled after composer error', error, info.componentStack);
    this.props.onError();
  }

  render(): ReactNode {
    if (this.state.failed) {
      return null;
    }
    return this.props.children;
  }
}

export function RobotEffects(): React.ReactElement | null {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return null;
  }
  return (
    <EffectsBoundary onError={() => setFailed(true)}>
      <EffectComposer multisampling={0} enableNormalPass>
        <N8AO aoRadius={0.12} intensity={1.15} />
        <Bloom luminanceThreshold={1.15} intensity={0.22} mipmapBlur />
        <Vignette offset={0.35} darkness={0.42} />
        <SMAA />
      </EffectComposer>
    </EffectsBoundary>
  );
}
```

If `tsc` rejects `enableNormalPass`, switch that prop to `disableNormalPass={false}` to match `node_modules/@react-three/postprocessing` types. Keep N8AO `aoRadius` / `intensity` as named in that package’s `.d.ts`.

In `app/components/RobotArmCanvas.tsx` import and mount last in `RobotScene`:

```tsx
import { RobotEffects } from './RobotEffects';
```

```tsx
      <group rotation={[-Math.PI / 2, 0, 0]}>
        <CadArm joints={joints} currentPosition={currentPosition} />
        <EoatAxes joints={joints} />
      </group>
      <RobotEffects />
```

- [ ] **Step 4: Tests + types**

Run: `npx jest tests/envAssets.test.ts --no-coverage && npx tsc --noEmit`

Expected: PASS / exit 0.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/components/RobotEffects.tsx app/components/RobotEffects.native.tsx app/components/RobotArmCanvas.tsx tests/envAssets.test.ts
git commit -m "feat: web N8AO bloom SMAA stack with native no-op"
```

---

### Task 4: Web HDR IBL with factory fallback

**Files:**
- Modify: `app/components/RobotStudio.tsx`

**Interfaces:**
- Consumes: `require('../../assets/env/machine_shop_01_2k.hdr')` (web only), `RGBELoader`, `PMREMGenerator`, `createFactoryEnvironmentScene`. Copy CadArm’s URI→ArrayBuffer helpers; do not refactor `CadArm.tsx`.
- Produces: `StudioEnvironment(): null`. First frame always factory IBL. Web then replaces `scene.environment` with HDR PMREM. Never assign HDR to `scene.background` (keep `#0A0908`). On failure: `console.warn('HDR IBL failed; keeping factory IBL', error)`.

There is no Jest/WebGL test for PMREM. Completeness = source contains the warn string, `tsc` clean, env asset test still green.

- [ ] **Step 1: Replace `app/components/RobotStudio.tsx`**

Keep `StudioLights` shadow camera as today: `left={-2.4}` `right={2.4}` `top={2.4}` `bottom={-2.4}`. On web: hemisphere `0.12`, key directional `1.2`, fill `0.18`, rect area `2.4` and `2.0`, exposure `0.98`. Native light numbers stay `0.28` / `1.55` / `0.32` / spot / exposure `1.04`.

```tsx
/**
 * Factory IBL + optional web HDR. No CDN. Renderer does not solve IK.
 */
import React, { useEffect, useLayoutEffect } from 'react';
import { Platform } from 'react-native';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { SoftShadows } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { createFactoryEnvironmentScene } from '../viewer/factoryEnvironment';

const SHADOW_MAP = Platform.OS === 'web' ? 2048 : 1024;
const IS_WEB = Platform.OS === 'web';
const HDR_MODULE: number | null = IS_WEB
  ? require('../../assets/env/machine_shop_01_2k.hdr')
  : null;

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const binary = globalThis.atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function arrayBufferFromUri(uri: string): Promise<ArrayBuffer> {
  try {
    const res = await fetch(uri);
    if (res.ok) {
      return await res.arrayBuffer();
    }
  } catch {
    // file:// fallback
  }
  const b64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToArrayBuffer(b64);
}

function bakeFactory(gl: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(gl);
  const { scene: room, dispose } = createFactoryEnvironmentScene();
  const envMap = pmrem.fromScene(room, 0.04).texture;
  dispose();
  pmrem.dispose();
  return envMap;
}

export function StudioEnvironment(): null {
  const { gl, scene } = useThree();

  useLayoutEffect(() => {
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = IS_WEB ? 0.98 : 1.04;
    if (IS_WEB) {
      RectAreaLightUniformsLib.init();
    }
    const factoryMap = bakeFactory(gl);
    const previous = scene.environment;
    scene.environment = factoryMap;
    scene.background = new THREE.Color('#0A0908');
    return () => {
      scene.environment = previous;
      factoryMap.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    if (!IS_WEB || HDR_MODULE == null) {
      return;
    }
    let cancelled = false;
    let hdrEnv: THREE.Texture | null = null;
    (async () => {
      try {
        const asset = Asset.fromModule(HDR_MODULE);
        await asset.downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        if (!uri) {
          throw new Error('HDR URI missing');
        }
        const parsed = new RGBELoader().parse(await arrayBufferFromUri(uri));
        const pmrem = new THREE.PMREMGenerator(gl);
        hdrEnv = pmrem.fromEquirectangular(parsed).texture;
        parsed.dispose();
        pmrem.dispose();
        if (cancelled) {
          hdrEnv.dispose();
          hdrEnv = null;
          return;
        }
        const old = scene.environment;
        scene.environment = hdrEnv;
        if (old && old !== hdrEnv) {
          old.dispose();
        }
      } catch (error) {
        console.warn('HDR IBL failed; keeping factory IBL', error);
      }
    })();
    return () => {
      cancelled = true;
      if (hdrEnv) {
        hdrEnv.dispose();
      }
    };
  }, [gl, scene]);

  return null;
}
```

Do not import `@react-three/postprocessing` here.

Append this `StudioLights` in the same file (web fills dimmed; native numbers unchanged):

```tsx
export function StudioLights(): React.ReactElement {
  return (
    <>
      {IS_WEB ? <SoftShadows samples={12} size={18} focus={0.42} /> : null}
      <hemisphereLight args={['#8FA0B0', '#1A1612', IS_WEB ? 0.12 : 0.28]} />
      <directionalLight
        castShadow
        position={[2.8, 5.6, 2.1]}
        intensity={IS_WEB ? 1.2 : 1.55}
        color="#FFF3E0"
        shadow-mapSize={[SHADOW_MAP, SHADOW_MAP]}
        shadow-bias={-0.00016}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={18}
        shadow-camera-left={-2.4}
        shadow-camera-right={2.4}
        shadow-camera-top={2.4}
        shadow-camera-bottom={-2.4}
      />
      <directionalLight
        position={[-3.4, 1.8, -1.6]}
        intensity={IS_WEB ? 0.18 : 0.32}
        color="#A9B7C6"
      />
      {IS_WEB ? (
        <>
          <rectAreaLight
            position={[-0.85, 2.68, -0.9]}
            rotation={[-Math.PI / 2, 0, 0]}
            width={1.2}
            height={0.12}
            intensity={2.4}
            color="#FFF4DC"
          />
          <rectAreaLight
            position={[0.95, 2.68, 0.35]}
            rotation={[-Math.PI / 2, 0, 0]}
            width={1.2}
            height={0.12}
            intensity={2.0}
            color="#FFF4DC"
          />
        </>
      ) : (
        <spotLight
          position={[0.2, 4.0, 0.5]}
          intensity={0.7}
          color="#F4F1EC"
          angle={0.62}
          penumbra={0.8}
          distance={14}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`

Expected: exit 0. If `RGBELoader.parse` typing rejects `ArrayBuffer`, cast. If `require('*.hdr')` fails, confirm `app/types/assets.d.ts` is included (it already is via the `app` tree).

- [ ] **Step 3: Commit**

```bash
git add app/components/RobotStudio.tsx
git commit -m "feat: bake vendored HDR as web environment lighting"
```

---

### Task 5: Full verification

**Files:** none new.

- [ ] **Step 1: Unit tests**

Run: `npx jest --no-coverage`

Expected: full suite PASS (previous 94 plus new map/env cases).

- [ ] **Step 2: Types**

Run: `npx tsc --noEmit`

Expected: exit 0.

- [ ] **Step 3: Manual web (Axel’s Mac)**

```bash
npx expo start --web --clear
```

Hard-refresh Cmd+Shift+R. Success: HDR highlights and scratches on yellow paint; darker joint roots; bay still our room; RGB EOAT on the flange. HDR failure must still draw the arm and log `HDR IBL failed; keeping factory IBL`.

- [ ] **Step 4: Push and update PR #2**

```bash
git push -u origin cursor/lrmate-ik-web-508a
```

---

## Spec coverage (self-review)

| Spec item | Task |
| --- | --- |
| Lightly used paint, scratches, roughness range, metal fingerprints | 1 |
| `paintNormal(size, { scratches })` tests | 1 |
| Vendored `machine_shop_01` 2K HDR + LICENSE | 2 |
| Metro `hdr` + `*.hdr` types | 2 |
| `@react-three/postprocessing` web-only | 3 |
| N8AO + Bloom + Vignette + SMAA; composer error → null | 3 |
| HDR as `scene.environment` only; factory fallback; dim web lights | 4 |
| Native factory IBL, no composer | 3 + 4 |
| No inverse / no cell dressing / EOAT stays | Global; no task edits kinematics or WorkCell props |
| Jest Node + tsc | 5 |
