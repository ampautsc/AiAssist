# 2025-07-16 — V2 Combat Engine: Flying Distance Bug Fix

## Summary
Deep analysis of V2 combat logs revealed a **critical bug**: the V2 engine's `gridDistance` function was purely 2D, completely ignoring flying altitude. This made melee enemies able to attack flying bards as if they were on the ground, destroying the primary survival mechanic for many bard builds.

## Root Cause Analysis

### The Problem
- **V2 win rate: 0% across ALL 9,096 sampled runs** — bard never won a single encounter
- V1 win rate also very low (mostly 0%) except undead-swarm (12% for one build)

### Investigation Steps
1. Scanned all 3,032 V2 log files — ZERO error strings, engine mechanically correct
2. Aggregated stats: 0% party wins, 93.9% enemy wins, 6.1% draws
3. Compared V1 vs V2 combat logs side-by-side
4. **Key observation**: In V1, melee enemies log "can't reach at 30ft" forever. In V2, enemies close to melee in 1-2 rounds.
5. Traced to `distanceBetween()` in V1's mechanics.js — uses 3D Euclidean distance (sqrt(horizontal² + 30²)) when one combatant is flying
6. V2's `gridDistance(pos1, pos2)` only uses 2D Chebyshev — no flying awareness at all

### Root Cause
- V1: Flying bard at 30ft altitude → melee enemies (zombies, ghouls) can never reach (even at same grid position, distance = 30ft > 5ft melee range)
- V2: Flying flag completely ignored → melee enemies attack normally, killing bard in 5-6 rounds

### Additional Findings
- Bard NEVER casts Fireball (0 bard fireballs out of 7,594 total — all enemy mage casts)
- Bard tactics profile relies on CC + Vicious Mockery cantrip for damage (avg 5 per round)
- V1 bard survives 17+ rounds because enemies can't reach flying position
- V2 bard dies in 5-6 rounds because enemies close to melee immediately

## Fix Implemented

### TurnMenu.js
- Added `FLYING_ALTITUDE_FT = 30` constant
- Added `combatDistance(creature1, creature2)` — 3D distance when one is flying
- Added `creatureToPointDistance(creature, point)` — for AoE spell center calculations  
- Replaced `gridDistance` with `combatDistance` in:
  - Weapon attack range checks (2 places)
  - Multiattack range checks
  - Single-target spell valid target filtering (action + bonus action)
  - AoE spell center range validation
- Kept `gridDistance` for movement distance (ground movement stays 2D)

### ActionResolver.js
- Replaced `_gridDistance` with `_combatDistance` for `within5ft` checks (melee advantage/disadvantage) in both `resolveAttack` and `resolveMultiattack`

### Tests Added (14 new tests)
- `combatDistance` unit tests: ground-to-ground, flying-to-flying, flying-vs-ground, symmetry
- `creatureToPointDistance` tests: flying creature to ground point, grounded creature 2D
- Integration tests: grounded enemy can't melee flying bard, flying-to-flying melee works, ranged weapons still reach flying targets, spell range uses 3D distance

### Results
- **254 / 254 V2 tests pass** (was 240, +14 new flying tests)
- **24 / 24 scenarioHarnessV2 tests pass**
- Zero regressions

## Scoring Formula Understanding
- `baseScore = (wins * 100 + stalemates * 50) / simulations`
- `efficiencyBonus` up to 20 pts based on: rounds, HP%, slots used
- Scores of 8-11 with 0% wins come from stalemates + efficiency bonus
- Formula is correct — will produce more meaningful scores with the flying fix

## What's Next
- Re-run full V2 simulation to verify improved win rates with flying fix
- Expected: flying bard builds should see significant win rate improvement, especially in scenarios with melee-only enemies (undead-swarm, werewolf-pack)
- Non-flying builds will still struggle (correct behavior — that's the point of the build comparison)

## Lessons Learned
- Always verify core physics/distance mechanics match between engine versions
- A 0% win rate across thousands of runs is a strong signal of a systematic bug, not just bad luck
- Log analysis is more efficient when comparing V1 vs V2 behavior on the same scenario
