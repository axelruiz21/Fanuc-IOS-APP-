# Editorial Night UI

**Date:** 2026-08-20  
**Status:** Locked — user chose editorial night over paper editorial  
**Repo:** `github.com/axelruiz21/Fanuc-IOS-APP-`  
**Branch:** extend `cursor/lrmate-ik-web-508a` / PR #2

---

## 1. Problem

The pendant reads as a dark admin dashboard: charcoal cards, FANUC yellow chips, rainbow Play/Pause/Step/Reset, CAD trapped under the editor. Students see software, not an instrument.

---

## 2. Direction

**Editorial night:** black field, bone type, **one gold rule**. Modernist, minimal, high-fashion night studio. Not a FANUC pendant clone. Not paper/Kinfolk light.

Kinematics, CAD posing, orbit math, EAS, and interpreter contracts do not change.

---

## 3. Locked decisions

1. **Palette.** Background `#080808`. Panels `#0C0C0C`. Bone text `#F4F1EC`. Muted `#8A8680`. Hairline `#2A2824`. Single gold `#C5A572` (rules, current line, ON state). Danger rust `#C47A6A`. No green/orange/blue/purple controls.
2. **Layout.** Landscape: CAD is the full-height hero (left). Right rail holds masthead, lessons, editor, transport, DATA, log. Gold 1px vertical rule between hero and rail. Portrait: CAD first, rail below.
3. **Type.** Small-caps tracked labels (`PROGRAM`, `ARM`, `DATA`). Mono only in editor/console/registers. Wordmark may use a serif. No emoji on buttons.
4. **Controls.** Play / Pause / Step / Reset / Break as text or hairline ghosts. One weight. Disabled = lower opacity.
5. **Log.** Bone on black. Errors rust. No per-opcode rainbow.
6. **3D chrome.** Scene background `#080808`. Quiet grid. Soft studio lights. Drop the debug `axesHelper`. CAD meshes and joint posing stay.

---

## 4. Out of scope

WPR, blending, new lessons, EAS builds, collision, rewriting kinematics.
