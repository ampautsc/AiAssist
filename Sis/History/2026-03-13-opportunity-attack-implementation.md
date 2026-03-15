# 2026-03-13 — Opportunity Attack Implementation

## Summary

Implemented a complete Opportunity Attack (OA) system for the D&D combat engine.

## Feature Overview

When a combatant voluntarily moves out of an enemy's melee reach (≤ 5 ft → > 5 ft) without having used the Disengage action, any enemy in that melee range can expend their reaction to make one melee attack — an Opportunity Attack.

## What Was Built

### Architecture Decisions
- OA uses the reactor's **reaction** (not their action). After the attack, `usedAction` is restored to its pre-OA value, but `reactedThisRound = true` is set.
- Both AI-controlled and player-controlled combatants **auto-take** OA (no interactive prompt for MVP).
- Disengaging (action) prevents all OA triggers for that turn.
- Creatures that have already reacted (`reactedThisRound: true`) cannot take OA.
- Dead enemies (HP ≤ 0) cannot take OA.

### Files Changed

**`ActionResolver.js` — `resolveMove`**
- Added OA trigger detection block before the normal move logic.
- Returns `opportunityAttackTriggers: [reactorId, ...]` in the move result.
- Checks: mover not disengaged, enemy ≤ 5 ft before move, enemy > 5 ft after move, enemy hasn't reacted.

**`EncounterRunner.js` — `processReactions`**
- Added `enemy_leaving_melee` event handling block (before the existing spell-reaction block).
- Iterates over `opportunityAttackTriggers` and calls `getReaction` + `applyReaction` for each.
- Added `opportunity_attack` case in `applyReaction` switch.
- The case: finds the reactor's first weapon, logs the OA, calls `_resolveAttack`, restores `usedAction`.

**`tactics.js`**
- Added `evalOpportunityAttack` function (returns `{ type: 'opportunity_attack' }` when `event.type === 'enemy_leaving_melee'` and reactor has a weapon).
- Added to `REACTION_PROFILES`: `generic_melee`, `undead_melee`, `cult_fanatic`, `dragon`, `giant_bruiser`.
- Left spellcaster profiles unchanged (they use reactions for spells).

**`CombatSessionManager.js`**
- Added `processOpportunityAttacks(session, moverId, oaTriggers)` helper function.
- Restructured `submitChoice`: OA processing now happens AFTER `session.state = resolution.state` so that `newLogs` captures both move logs AND OA logs.
- Wired `processOpportunityAttacks` into `runAiCombatantTurn` Phase 1 (normal AI move) and Phase 2 (post-dash move).

### Tests Added

**`engine-v2/__tests__/reactions.test.js`** — 10 new unit tests:

`resolveMove trigger detection` (6 tests):
- Leaves reach → OA trigger added
- Stays within reach → no trigger
- Disengaged mover → no trigger
- Reactor `reactedThisRound` → no trigger
- Enemy already out of reach before move → no trigger  
- Dead reactor → no trigger

`processReactions applies OA` (4 tests):
- OA fires; reactor gets `reactedThisRound = true`
- Already-reacted reactor is skipped
- Empty trigger list → no OA logs
- OA does NOT set `usedAction` (reaction only)

**`tests/e2e/combat-ai.spec.ts`** — 2 new E2E tests:
- Bard moves adjacent then away from zombie → server log contains "opportunity attack"
- Bard Disengages then moves away → no "opportunity attack" in log

## Test Results

- Engine unit tests: **1521 pass, 0 fail** (was 1468 before adding tests)
- E2E tests: **97 pass, 0 fail** (was 95 before)

## OA Trigger Math (Hex)

```
Bard at (0, 0), Zombie at (3, -1) — 3 hexes = 15 ft apart (not adjacent)

Step 1: Bard moves to (2, -1)
  distBefore = max(|0-3|, |0+1|, |0+3+0-1|) × 5 = max(3,1,2) × 5 = 15 ft  (not adjacent)
  → No OA trigger

Step 2: Bard moves from (2, -1) to (-2, 0)
  distBefore = max(|2-3|, |-1+1|, |2-3-1+1|) × 5 = max(1,0,1) × 5 = 5 ft  ✓ (adjacent)
  distAfter  = max(|-2-3|, |0+1|, |-2-3+0+1|) × 5 = max(5,1,4) × 5 = 25 ft ✓ (out of reach)
  → OA TRIGGERS
```

## Insight

The OA system cleanly threads through four layers without coupling them:
1. **ActionResolver** detects triggers as a pure function of positions
2. **EncounterRunner** dispatches the reaction event (AI-vs-AI simulation path)
3. **tactics.js** decides whether to react (evaluator)
4. **CombatSessionManager** dispatches the reaction for live sessions (player-vs-AI path)

This separation means the feature is fully testable at each layer independently.
