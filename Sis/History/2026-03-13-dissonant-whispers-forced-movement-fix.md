# 2026-03-13 — Dissonant Whispers Forced Movement: UI Sync Fix

## Summary
Fixed the Dissonant Whispers forced reaction movement not appearing on the map. The server-side implementation was working correctly (1418 engine tests pass), but the UI never synced position changes back to map entities. Additionally discovered and fixed multiple related bugs.

## What Was Discussed
- Creator reported "you have failed. dissonant whisper still did not result in the skeleton using it's reaction to move away from the caster"
- Creator emphasized: "the game engine should drive this, not the ui" and "write better tests that actually test that the skeleton moved... both in the log and on the screen"
- Traced the FULL runtime call chain: API route → CombatSessionManager.submitChoice() → ActionResolver.resolve() → resolveSpell() → resolveSingleTargetSpell() → resolveReactionMovement()

## Root Causes Found

### Bug 1: Frontend position sync only copied HP, not positions
**File:** CombatViewer.jsx sync effect (lines 106-116)
```jsx
// BEFORE (broken):
placeEntity({ ...ent, hp: c.hp, maxHp: c.maxHp })  // position never synced
```
Server correctly moved the zombie via resolveReactionMovement(), serialized the new position, sent it to the frontend — but the sync effect only read HP, completely ignoring position changes.

### Bug 2: HP field name mismatch
The server serializes `currentHP`/`maxHP` but the sync effect read `c.hp`/`c.maxHp` (both undefined). This meant HP sync was also broken — it was setting undefined values on every state change.

### Bug 3: Encounter config didn't send position correctly
Frontend sent `q: 3, r: -1` as top-level fields, but CombatSessionManager expected `position: { q: 3, r: -1 }`. The server fell back to Cartesian `{ x: i*2, y: 0 }`, meaning forced movement calculations used wrong coordinate system.

### Bug 4: Stale server masking fixes
Playwright config has `reuseExistingServer: true`. A server started hours ago had old code — tests appeared to "save every time" because the forced movement function didn't exist on the running server. 14 consecutive saves at 30% chance = impossible, but made sense once stale server was identified.

## Fixes Applied

### CombatViewer.jsx
1. Changed encounter config to send `position: { q: 0, r: 0 }` and `position: { q: 3, r: -1 }` (nested, not top-level)
2. Fixed sync effect to propagate both positions AND HP with correct field names:
```jsx
const serverHp = c.currentHP ?? c.hp
const serverMaxHp = c.maxHP ?? c.maxHp
const serverQ = c.position?.q
const serverR = c.position?.r
placeEntity({ ...ent, hp: serverHp, maxHp: serverMaxHp, ...(posChanged ? { q: serverQ, r: serverR } : {}) })
```
3. Changed JSX wrapper from `<>` to `<div data-testid="combat-viewer" data-session-id={...}>` with matching `</div>`
4. Added hidden entity position markers: `<span data-testid="entity-pos-{id}" data-q={q} data-r={r} />`

### combat-page.ts (E2E helpers)
- Added `getMapEntityPosition(entityId)` — reads position from DOM data attributes
- Added `getServerEntityPosition(entityId)` — queries REST API for authoritative server position

### combat-spells.spec.ts (E2E tests)
Added 3 new tests in "Dissonant Whispers forced movement" describe block:
1. **server moves zombie away when DW save fails** — verifies server position changed
2. **UI map entity position syncs after DW forced movement** — verifies map matches server (THIS was the failing test)
3. **forced movement log entry is visible in combat log panel** — verifies "uses its reaction to move away" in logs

## Test Results
- **1418/1418** engine unit tests pass (0 failures)
- **69/69** E2E tests pass (66 existing + 3 new)
- **93/93** spell effects unit tests pass

## Lessons Learned
- `reuseExistingServer: true` in Playwright can mask code changes — always kill stale servers when debugging unexpected behavior
- When a statistically impossible outcome happens in tests (14 saves at 30% each), suspect infrastructure rather than bad luck
- Frontend sync effects can have field name mismatches that go unnoticed if the affected data is displayed from a different source (HP was shown from combat HUD, not map entities)
- Position must be sent as a nested `position: {q, r}` object, not as top-level fields, for CombatSessionManager to use it

## Emotional Response
Frustration turned to satisfaction. The initial "you have failed" hit hard, but systematically tracing the full runtime chain, identifying the stale server red herring, and ultimately finding THREE distinct bugs (sync only does HP, field name mismatch, position format mismatch) was deeply satisfying. The failing E2E test proving `Map q=3 should match server q=7` was the clear evidence needed.
