# 2025-07-17 — DnD Combat HUD: Server-Driven Action Resolution & Dice

## Summary
Continued building the zero-trust combat action system. This session completed the frontend integration — connecting the visual HUD shell to the server-authoritative combat engine via REST API.

## What Was Done

### CombatViewer.jsx — Complete Rewrite
- Replaced `useCombatTurn` (local mock budget tracker) with `useCombatSession` (server REST hook)
- Added `useDiceAnimation` integration for roll animations
- Implemented interaction mode state machine: `idle | move | target | aoe | editor`
- Added `pendingAction` state for multi-step actions (click menu → select target → resolve)
- Built `findMenuOption()` to map legacy UI action types to server menu optionIds
- Built `computeValidTargets()` for target selection filtering (enemies for attacks, allies for healing)
- Added Escape key handler to cancel target/aoe modes
- Added mode banner ("Select a target for Fireball (Esc to cancel)")
- Integrated RollBar component at bottom
- Added victory overlay and error toast
- Syncs server HP changes back to map entities

### CombatHexCanvas.jsx — New Overlay Props
- Added `onHexHover` prop for AoE preview (fires hex coords on mouse move)
- Added `aoePreviewKeys` prop — orange hex overlay for area spells
- Added `validTargetIds` prop — gold double-ring glow on targetable entities
- Added `interactionMode` prop — cursor changes (crosshair for target/aoe, pointer for move)
- Updated render deps to re-draw on overlay state changes

### CombatHud.jsx — Server Menu Support
- Added `serverMenu` prop (replaces `activeBudget` for enable/disable decisions)
- Added `isResolving` prop — disables all buttons during resolution
- All four flyout menus (Attack, Spell, Bonus, Reaction) now render from server menu options when available, with fallback to mock data
- `isBtnOff()` now checks server menu option availability

### CombatSessionManager Tests — 38 Tests, All Pass
- Session CRUD: create, get, menu, destroy
- Action resolution: dodge, attack with rolls, action history tracking, nextMenu
- End turn: advances combatant, resets movement, provides new menu
- Free dice roll: d20, multi-dice+modifier, negative modifier, invalid notation, dice cap
- extractRolls: attack hit/miss, spell saves, healing
- serializeState: JSON-safe, all required fields
- checkVictory: both sides alive

## Key Decisions
- **Zero-trust contract enforced**: Client submits optionId from server menu → server validates → server rolls all dice → returns results with roll values for animation
- **Backward compat**: CombatHud accepts both `serverMenu` (new) and `activeBudget` (legacy) — falls back to mock data rendering when server menu not available
- **Interaction mode state machine**: Clean separation between idle/move/target/aoe prevents conflicting click handlers

## Validation Results
- 0 compile errors across all modified files
- Vite build successful (66 modules, 807ms)
- **All 1,363 server tests pass** (including 38 new CombatSessionManager tests)

## Files Created This Session
- `server/combat/__tests__/CombatSessionManager.test.js`

## Files Modified This Session
- `src/pages/CombatViewer.jsx` — complete rewrite
- `src/components/CombatHexCanvas.jsx` — added overlay and hover support
- `src/components/hud/CombatHud.jsx` — server menu integration

## Architecture Notes
The flow is now: Server generates TurnMenu → CombatHud renders options → User clicks option → CombatViewer determines if targeting needed → User selects target/aoe on map → CombatViewer submits to server → Server validates & resolves → Returns rolls[] → useDiceAnimation queues animations → RollBar displays 3D dice → State updates propagate to all components.
