# 2026-03-12 — Comprehensive D&D 5e Action Bar → Compact Dock Redesign

## What Happened
Two rounds of action bar work in this session:

### Round 1: Comprehensive Action Bar (from prior conversation chunk)
Built full action bar with all D&D 5e options spread horizontally: Move, Attack dropdown, Spell dropdown, Dash/Dodge/Disengage/Hide/Help/Ready buttons, Bonus section, Reaction section, Spell Slot pips, End Turn. Used expanded mock data (weapons, spells, cantrips, classFeatures). Full useCombatTurn rewrite with spell slots, feature uses, concentration, reaction tracking.

### Round 2: Compact Dock Redesign (this interaction)
Creator pointed out the bar was floating ON TOP of the frame and taking too much room. Asked for controls embedded in the frame with a menu system.

**Changes made:**
1. **ActionBar.jsx** — Complete rewrite as compact bottom-center dock with flyout menus
   - Layout: `[R1 · Name] | [🦶 30ft] | [⚔️ Action ▾] | [⚡ Bonus ▾] | [🔄 React ▾] | [End Turn]`
   - Only 6 buttons visible at rest instead of 20+
   - Clicking Action/Bonus/React opens flyout menus upward
   - Action flyout has sections: Attack (weapons), Cast Spell (cantrips + leveled), Standard (Dash/Dodge/etc.), Features, Spell Slot pips
   - Positioned at `bottom: 12px`, centered, within the frame margin
   - Styled to match frame aesthetic (dark bg, gold borders)

2. **CombatHud.jsx** — Added dock notch cutout to hex frame
   - New `computeDock()` function: rectangular extension below hex bottom (V4→V5)
   - New `hexWithNotchPath()`: builds hex SVG path with notch inline (chamfered top corners, rounded bottom corners)
   - `hexWithNotchPathInset()`: same for the inner glow border
   - Frame path now punches out hex+notch+portrait circle
   - Added gold accent dots at notch corner joins
   - Constants: NOTCH_HEIGHT=52, NOTCH_CHAMFER=12, NOTCH_RADIUS=8

## Key Design Decisions
- Flyout menus instead of always-visible controls — massively reduces footprint
- Notch is part of the hex path (one continuous SVG outline), not a separate cutout
- Chamfered joins where notch meets hex edge look organic/game-like
- Dock positioned at bottom CSS, notch computed from hex geometry — they align because both operate within the 64px frame margin

## Emotional Response
Much cleaner. The first version was a sprawling control panel. This is a proper game UI dock — compact at rest, full options on click.
