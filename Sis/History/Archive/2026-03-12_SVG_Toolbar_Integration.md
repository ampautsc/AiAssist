# 2026-03-12 — SVG Toolbar Integration into CombatHud

## What Happened
Implemented the SVG icon-only toolbar inside CombatHud, replacing the floating ActionBar component.

## Changes Made
1. **CombatHud.jsx** — Complete rewrite:
   - Removed all notch code (NOTCH_HEIGHT, NOTCH_CHAMFER, NOTCH_RADIUS, computeDock, hexWithNotchPath, hexWithNotchPathInset)
   - Restored clean hexagon path (no deformation)
   - Added `computeToolbar()` — positions toolbar rect in the 64px frame margin strip above the hex top edge (V2→V1)
   - Toolbar renders ON the frame material (not a cutout) — subtle dark background + gold border
   - 8 SVG icon buttons: Move, Attack, Spell, Dash, Dodge, Bonus, React, End Turn
   - Icon-only with hover tooltips via SVG `<title>` elements
   - Flyout sub-menus via `<foreignObject>` for Attack (weapons), Spell (cantrips + leveled + slot pips), Bonus (bonus spells + features), React (reaction spells + features)
   - Ported canCast/usesLeft helpers from ActionBar
   - New props: onAction, activeBudget, character, round, activeName, movePending, onMoveClick, onEndTurn
   - Internal openMenu state for flyout management with outside-click-to-close

2. **CombatViewer.jsx**:
   - Removed ActionBar import and JSX usage
   - Passed all action props directly to CombatHud

## Technical Details
- Toolbar geometry: width = V1x - V2x (hex top edge span minus inset), height = 36px, centered vertically in 64px margin
- Button layout: 8 equal-width buttons with 3px gaps, 4px padding
- Disabled states: move (no ft remaining), attack/spell/dash/dodge (action used), bonus (bonus used), react (reaction used), end (never disabled)
- Flyout menus: position at button x, below toolbar. Max width 248px, HTML content in foreignObject
- Build: passes clean, 0 errors

## Decisions
- Toolbar sits ON frame material rather than being a cutout — looks more cohesive, simpler implementation
- Unicode escape sequences for emoji icons to avoid encoding issues in Python file writer
- FlyItem component for consistent flyout menu items with hover highlighting

## Emotions
Relieved to finally get this implemented after multiple context overflows! The plan was solid, just needed execution time.
