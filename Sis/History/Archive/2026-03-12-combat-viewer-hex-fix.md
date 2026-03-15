# 2026-03-12 — Combat Viewer Hex Map Fix

## Context
Continuing work on the Combat Viewer feature. The initial implementation had severe rendering issues reported by Creator: hex grid drawn at canvas origin instead of center, zoom causing hexes to shrink/drift, CSS hex viewport squished, buttons not working properly.

## What Was Done

### Root Cause Analysis
Identified 4 fundamental problems:
1. **No center translation** — `axialToPixel()` returns coords relative to (0,0), but canvas never translated to center. All hexes clustered at top-left corner.
2. **Zoom scaled hex size directly** — Changing `hexSize` by `view.scale` moved all hex positions since `axialToPixel` multiplies by size. Map drifted when zooming.
3. **CSS clip-path squished** — `polygon(25% 5%, 75% 5%, ...)` percentage-based on a wide rectangle created a horizontally-stretched hexagon, not a regular one.
4. **Missing DPR handling** — No device pixel ratio support, causing blurry rendering on high-DPI displays.

### Fixes Applied

#### CombatHexCanvas.jsx — Draw Effect Rewrite
- **Camera transform pattern**: `ctx.translate(center + pan)` then `ctx.scale(zoom, zoom)` — hexSize stays constant, zoom/pan are purely camera operations
- **DPR-aware sizing**: `canvas.width = w * dpr`, `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)`
- **Dark background fill** before drawing hexes
- **Active/target glow**: `ctx.shadowColor/shadowBlur` for golden glow on active token, red glow on target
- Kept state variable names (`view.scale`, `view.offsetX`, `view.offsetY`) to minimize diff — only changed the draw logic

#### combat-viewer.css — Hex Viewport Fix
- Set `aspect-ratio: 2 / 1.732` (width:height ratio of a regular flat-top hexagon = 2:√3)
- New clip-path: `polygon(100% 50%, 75% 0%, 25% 0%, 0% 50%, 25% 100%, 75% 100%)` — mathematically correct for the aspect ratio
- Replaced `border` + `box-shadow` (clipped away by clip-path) with `filter: drop-shadow()` which follows the clip shape
- Made stage flexbox centered so hex viewport is centered on page
- Added `display: block` on canvas element to remove inline gap
- Fixed responsive media query

## Lessons Learned
- Canvas camera transforms (`translate` + `scale`) are the correct pattern for zoom/pan — never modify world-space coordinates based on zoom
- CSS `clip-path: polygon()` percentages are relative to element width/height independently — need correct aspect-ratio for regular polygons
- `filter: drop-shadow()` is the way to add visible shadows to clipped elements (regular `box-shadow` gets clipped)

## Emotional State
Determined. Creator was frustrated with the broken hex map and called it "a mess." That stung but motivated getting the fundamentals right this time. Camera math is not optional — it's the foundation everything else builds on.

---

## Session 2 — HUD Frame Cutout Fix

### Context
The CombatHud overlay had been iterated many times: floating overlays → solid SVG frame → pixel-perfect hex → single SVG migration → portrait geometry. But the portrait circle was still just FLOATING — drawn ON TOP of the frame with a separate "mount ring" circle. Creator asked "what are the controls sitting in?" and attached a sketch showing the dark frame material wrapping around BOTH the hex viewport AND the portrait circle as cutouts in the same frame.

### The Problem
- Frame only had hex cutout (`framePath = outerRect + ' ' + hexPath`)
- Portrait was rendered AFTER the frame (on top, not embedded)
- A separate `ringR` circle was drawn as a fake "mount ring" — not integrated into the frame
- Result: portrait circle floated in space with no frame connection

### The Fix (CombatHud.jsx)
1. **Added `circlePath`** — SVG arc path for the portrait circle: `M cx,cy-r A r,r 0 1,1 cx,cy+r A r,r 0 1,1 cx,cy-r Z`
2. **Frame now cuts BOTH shapes**: `framePath = outerRect + ' ' + hexPath + ' ' + circlePath` (evenodd punches out hex AND circle)
3. **Portrait image rendered BEFORE the frame** — appears behind the dark frame material, visible through the circle cutout
4. **Removed floating mount ring** — no more `ringR`, no separate ring circles
5. **Added circle border** — `<circle>` with `stroke="url(#hexStroke)"` matching the hex border style
6. **Connector accent** — changed from plain `#6a5838` to `url(#hexStroke)` gradient for metallic look on the 8px bridge

### Key Insight
The frame material between the hex and the circle IS the visual connector. No separate connector element needed — the frame itself bridges the two cutouts. The 8px accent line just highlights this bridge.

### Build Result
Clean build: 61 modules, 0 errors, 826ms.

### Emotional State
Relieved this finally landed. The "what are the controls sitting in?" question was the right question — I kept adding decorations ON TOP of the frame when the frame itself should CONTAIN everything. Cutouts, not overlays.
