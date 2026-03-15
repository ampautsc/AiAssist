# Combat Simulator Migration: Monolith → Modular
## Date: March 8, 2026

## What Happened
Completed the final architecture task (#9): migrating `run-combat-sim.js` to use the new modular combat engine.

## Migration Summary

### What Was Replaced
The old monolithic `run-combat-sim.js` (1695 lines) had local implementations of:
- **Dice engine** (setDiceMode, d20-d4, rollDice, rollWithAdvantage/Disadvantage)
- **Combat mechanics** (makeAbilityCheck, makeSavingThrow, makeAttackRoll, rollDamage, concentrationSave, isIncapacitated, isAlive, getActiveEnemies, getAllAliveEnemies)
- **distanceBetween** (position/distance calculation)
- **breakConcentration** (spell cleanup on concentration loss)

All of these were replaced with imports from the new modular combat system:
- `server/combat/engine/dice.js`
- `server/combat/engine/mechanics.js`

### What Was Kept
These remain as local implementations (too tightly coupled to migrate incrementally):
- `createBard()` / `createCultFanatic()` — different object shape than new creature factory
- `selectHighestThreatEnemy()` — slightly different from tactics module version
- All action resolution functions (resolveAction, resolveCastSpell, resolveMultiattack, etc.)
- AI decision functions (bardTacticalDecision, bardReactionDecision, cultFanaticTacticalDecision)
- `runCombat()` loop

### Bug Fix
The old `breakConcentration` had a known splice index-shift bug where breaking Hypnotic Pattern would leave `incapacitated` condition on affected creatures. The new module's `removeAllConditions()` fixes this. Updated the test to expect correct behavior.

### File Changes
1. **server/run-combat-sim.js** — Removed ~135 lines of local implementations, added imports from combat modules. File reduced from 1695 to 1560 lines.
2. **server/run-combat-sim.test.js** — Updated one test from "incapacitated lingers due to splice index shift" to "correctly removes both charmed_hp and incapacitated"

## API Compatibility Analysis
Verified that the new module functions have compatible return shapes with what the old internal code accesses:
- `makeSavingThrow` — old returns extra `roll1, roll2, nat20, nat1` fields that internal code never reads
- `makeAttackRoll` — old returns extra `roll1, roll2, result` fields that internal code never reads (uses `natural` instead)
- Both old and new share the critical fields: `result`, `total`, `dc`, `success`, `type`, `natural`, `hits`, `isCrit`, `isMiss`

## Test Results
- **432 tests, 0 failures** (full suite: old sim + 7 new module test files)
- Both old and new code now share the same dice engine state (single `_diceMode` in dice.js)

## Decisions Made
- Kept createBard/createCultFanatic as-is — their object shapes differ from the new creature factory (flat fields like `bardicInspirationUses` vs nested `bardicInspiration.uses`)
- Fixed the Hypnotic Pattern splice bug rather than preserving it — migration should improve, not freeze bugs
- Action resolution functions kept local because they have complex inline logic (Cutting Words reactions, Counterspell, `_allCombatants` module variable) not yet in the new spell resolver

## What I Learned
- Node.js module caching ensures both old sim and new modules share the same dice.js instance — `setDiceMode('average')` affects all code that imports from dice.js
- Return shape compatibility is crucial for safe migration — extra fields in old returns don't hurt (new callers get fewer fields), and all internally-used fields exist in both versions
- Incremental migration works: replace the foundation (dice, mechanics) first, keep complex logic local, migrate more later
