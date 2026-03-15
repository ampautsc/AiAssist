# Combat Architecture Continuation: AI Tactics Module
## Date: March 8, 2026 (Session 2)

## What Happened
Continued building the data-driven combat architecture from the prior session. The prior session created the dice engine, mechanics, spell registry, creature factory, spell resolver, and encounter runner (337 tests, all passing). This session:

1. **Created barrel exports** (`server/combat/index.js`) — single entry point re-exporting all 7 sub-modules
2. **Built the AI Tactics Module** (`server/combat/ai/tactics.js`) — the main deliverable

## AI Tactics Architecture
Instead of per-creature hardcoded functions (`bardTacticalDecision`, `cultFanaticTacticalDecision`), the new system uses:

### Evaluators
Small pure functions that assess one tactical situation and return a decision or null:
- `evalSurvivalInvisibility` — GI when HP critical
- `evalOpeningAoEDisable` — Gem Flight + Hypnotic Pattern round 1
- `evalConcentrationAllDisabled` — Dodge when all enemies disabled
- `evalConcentrationMeleeViciousMockery` — VM for disadvantage protection
- `evalConcentrationFinishWithCrossbow` — finish low-HP target
- `evalConcentrationBreathWeapon` — free AoE damage
- `evalConcentrationRangedViciousMockery` — VM at range
- `evalConcentrationSelfHeal` — Healing Word bonus action
- `evalRecastHypnoticPattern` — re-establish AoE control
- `evalCastHoldPerson` — single target paralyze
- `evalFallbackCantrip` — VM or Sacred Flame
- `evalDodge` — ultimate fallback
- `evalEnemyInvisibleFallback` — when can't see target
- `evalFlyingTargetRanged` — Hold Person / Sacred Flame vs flyers
- `evalOpeningSpiritualWeapon` — round 1 SW + melee
- `evalShakeAwakeAllies` — free charmed allies
- `evalMeleeAttack` — multiattack or weapon attack
- `evalInflictWounds` — big melee spell damage
- `evalRangedCantripWithApproach` — Sacred Flame + close distance
- `evalCuttingWords` / `evalCounterspell` — reaction evaluators

### Profiles
Ordered lists of evaluators defining creature behavior:
- `lore_bard` — 11 evaluators in priority order
- `cult_fanatic` — 8 evaluators
- `generic_melee` — 2 evaluators
- `generic_ranged` — 2 evaluators

### Decision Engine
- `makeDecision(profileName, me, allCombatants, round)` — runs evaluators in order, first non-null wins
- `makeReaction(profileName, me, trigger)` — same for reactions
- `makeTacticalAI(profileMap)` — factory creating `getDecision` callback for encounter runner
- `assessBattlefield()` — builds reusable context snapshot

## Bug Found & Fixed
Cantrips (Vicious Mockery, Sacred Flame) are stored in `me.cantrips`, not `me.spellsKnown`. Six evaluators were checking the wrong array. Fixed all occurrences.

## Test Results
- AI Tactics tests: **95 tests, 31 suites, 0 failures**
- Full suite (8 files): **432 tests, 122 suites, 0 failures, 174ms**

## Decisions Made
- Evaluator pattern chosen over decision trees — each evaluator is independently testable
- Profiles are just arrays of evaluators — easy to compose, extend, and test
- Self-heal bonus action uses `_bonusActionOnly` flag for merging into next real decision
- Reaction evaluators are separate from tactical profiles (different trigger model)

## What's Next
- Migration of old `run-combat-sim.js` to use new modules (item 9 on todo list)
- This enables: new creature templates, new encounter configurations, hundreds of test scenarios
