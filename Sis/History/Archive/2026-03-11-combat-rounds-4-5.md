# History — 2026-03-11 — Combat Simulation Rounds 4 & 5

## Context
Continuation of combat simulation optimization. Rounds 1-3 brought overall win rate from 0.68% to 2.43% and top build average from ~17 to 32.55. This session covers Rounds 4 and 5.

---

## Round 4: The Dragon Flying Bug & Polymorph Overhaul

### What Was Discovered
**CRITICAL BUG: Dragon always flies at 40ft altitude**. The dragon creature had `flying: true`, which meant `combatDistance()` always returned 30ft (altitude-based). Since all melee weapons have 5-10ft range, the bard could NEVER hit the dragon in melee, even as Giant Ape. Every melee attack showed "too far away" and the ape sat there doing nothing.

### What Was Fixed (10 fixes total)
1. **Dragon landing mechanic** — Dragon lands (flying=false) after using breath weapon, stays grounded for 2 turns
2. **Polymorph beast forms completeness** — Added Giant Ape and Brown Bear multiattack, Dire Wolf knockdown, Giant Constrictor grapple
3. **Beast form AI (evalBeastFormMelee)** — New evaluator for beasts to attack nearest targets
4. **Concentration self-heal** — Bard heals with Healing Word while maintaining concentration spells
5. **Dragon Fear evaluator** — Uses breath weapon racial trait against dragons
6. **Proactive Greater Invisibility** — Casts before engaging dangerous single targets
7. **Recast Hypnotic Pattern** — Re-casts HP if concentration was broken and enemies remain
8. **Hold Person evaluator** — Targets humanoid enemies for auto-crit setup
9. **Faerie Fire evaluator** — Grants advantage against targets when other control fails
10. **Offensive Shatter/DW evaluators** — Uses damage spells as action when no better option

### Results
- **Top build: 32.55 → 43.17 average score** (+32.6%)
- **Overall win rate: 2.43% → 7.39%** (+204%)
- Round 4 MongoDB record ID: `69b1e293173a1e694d6ae32b`

### Per-Scenario Improvements (Round 3 → Round 4)
| Scenario | R3 Best | R4 Best | Change |
|----------|---------|---------|--------|
| Undead Swarm | 31% | 50% | +19pp |
| Werewolf Pack | 17% | 32% | +15pp |
| Cult Fanatics | 10% | 17% | +7pp |
| Dragon Assault | 3% | 8% | +5pp |
| Frost Giant | 2% | 5% | +3pp |
| Lich Encounter | 6% | 15% | +9pp |
| Archmage Duel | 11% | 27% | +16pp |
| Mixed Encounter | 0.1% | 0.2% | +0.1pp |

---

## Round 5: Counterspell Fix & Multi-Enemy Optimization

### Deep Analysis Findings
Launched comprehensive codebase analysis to identify remaining weaknesses. Key findings:

1. **CRITICAL BUG: Counterspell completely broken for non-concentration spells**
   - Reactions process AFTER spell resolution
   - Undo logic only handled concentration spells via `charmedBy`/`heldBy` fields
   - These fields are only set for charm-type spells, never for damage spells
   - Result: Fireball, Power Word Stun, Finger of Death, Inflict Wounds, Command ALL persist even when "countered"
   - The bard wasted a 3rd-level slot for literally zero effect on 5/7 dangerous spells

2. **Enemy mage/archmage have EMPTY reaction profiles** — They never use Counterspell despite knowing it

3. **Self-polymorph triggers too narrow** — Only triggered for 1-2 enemies with 50+ HP or HP<60%, missed scenarios with 4+ weak enemies or 3 tough enemies

4. **Beast form targets "highest threat"** — Should target weakest when many enemies, to reduce action economy

5. **No proactive Healing Word** — Bard never heals during non-concentration turns

### What Was Fixed (4 fixes)

#### Fix 1: evalSelfPolymorph broadened triggers
- NEW: Triggers for ≥4 active enemies (regardless of HP)
- NEW: Triggers for ≥3 enemies with combined HP > 200
- Existing: ≤2 enemies with 50+ HP, HP<60%, 2+ enemies in melee

#### Fix 2: Beast form targets weakest when ≥3 enemies
- When facing 3+ enemies, `selectWeakest()` replaces `selectHighestThreat()`
- Rationale: Kill weak mobs first to reduce incoming action economy

#### Fix 3: evalProactiveHealingWord (NEW)
- Fires when HP < 70%, not in beast form, has Healing Word + 1st-level slot
- Returns `_bonusActionOnly: true`, merges with any main action
- Provides sustain across all scenarios

#### Fix 4: Counterspell pre-spell-state snapshot/revert (BIGGEST FIX)
- Capture `preActionState` before `ActionResolver.resolve()`
- Pass to `processReactions()` and `applyReaction()`
- On successful counterspell: revert to preSpellState, then re-apply ONLY resource spending (caster slot + action, reactor slot + reaction)
- This properly undoes ALL spell effects (damage, conditions, concentration)
- Fallback for direct calls: uses `ActionResolver._breakConcentration()` for concentration spells

### Testing
- 16 new tests added across 4 describe blocks in reactions.test.js
- **1317 total tests passing, 0 failures** (up from 1305 pre-Round 5)
- Test categories:
  - Counterspell pre-spell-state revert: 4 tests (damage revert, condition revert, processReactions integration, fallback)
  - Broadened polymorph triggers: 3 tests (≥4 enemies, tough group, negative case)
  - Beast form weakest targeting: 2 tests (≥3 enemies, <3 enemies)
  - Proactive Healing Word: 3 tests (triggers, threshold check, beast form exclusion)

### Diagnostic Verification
Ran Mixed Encounter (8 enemies) with average dice:
- Round 1: Bard casts Hypnotic Pattern, charms 7/8 enemies
- Rounds 2-7: DW kills Bandit Captain (65HP) while 7 enemies charmed
- Rounds 8-10: DW kills 3 bandits one at a time
- Round 11: HP expires → Bard self-polymorphs into Giant Ape (157HP!)
- Rounds 12-15: Giant Ape kills bandit, mage, 1 ogre
- Result: Draw at round 15 (1 ogre at 36.5HP, ape at 24HP) — extremely close with average dice. Random dice will produce real variance.

### Results — ROUND 5 COMPLETE
- **Top build: 43.17 → 46.43 average score** (+7.6%)
- **Overall win rate: 7.39% → 11.71%** (+58.6% relative improvement!)
- Record ID: `69b1ec469baeab940a2fed2a`
- Duration: 453.6s (379 builds × 8 scenarios × 100 sims)
- New #1 build: **Aasimar — Armored Tank** (46.43 avg)

### Per-Scenario Results (Round 4 → Round 5)

| Scenario | R4 Wins | R5 Wins | Change | Relative |
|----------|---------|---------|--------|----------|
| Undead Swarm | 16.8% | 18.7% | +1.9pp | +11% |
| Werewolf Pack | 12.6% | 18.3% | +5.7pp | **+45%** |
| Cult Fanatics | 6.6% | 9.6% | +3.0pp | **+45%** |
| Dragon Assault | 2.4% | 2.4% | +0.0pp | 0% |
| Frost Giant | 1.7% | 3.5% | +1.8pp | **+104%** |
| Lich Encounter | 7.2% | 14.0% | +6.8pp | **+94%** |
| Archmage Duel | 11.7% | 26.9% | +15.2pp | **+130%** |
| Mixed Encounter | 0.1% | 0.3% | +0.2pp | +83% |

### Fix Attribution
- **Counterspell fix** drove Archmage (+130%) and Lich (+94%) — the biggest single improvement. Counterspell now actually prevents damage/conditions.
- **Broadened self-polymorph** drove Frost Giant (+104%) and Werewolf (+45%) — Giant Ape triggers more reliably in multi-enemy fights.
- **Beast form weakest targeting & Healing Word** contributed incremental gains across all scenarios.
- **Dragon unchanged** (2.4%) — expected since dragon doesn't cast spells (Counterspell irrelevant) and polymorph/HW changes are marginal for single-boss fights.

### Cumulative Progress (Rounds 1-5)
| Metric | Round 1 | Round 2 | Round 3 | Round 4 | Round 5 |
|--------|---------|---------|---------|---------|---------|
| Top Avg | ~17 | ~22 | 32.55 | 43.17 | **46.43** |
| Win Rate | 0.68% | ~1.5% | 2.43% | 7.39% | **11.71%** |

---

## Technical Notes

### Key Code Locations
- `server/combat/ai/tactics.js` — All evaluator functions and lore_bard profile
- `server/combat/engine-v2/EncounterRunner.js` — Encounter loop, reactions, counterspell logic
- `server/combat/engine-v2/__tests__/reactions.test.js` — All Round 5 tests
- Encounter result object: `r.log` for combat log (not `r.combatLog` or `r.logs`)

### MongoDB Records
- Round 3: `69b1d300984179f59855ae08` (32.55 avg, 2.43% overall)
- Round 4: `69b1e293173a1e694d6ae32b` (43.17 avg, 7.39% overall)
- Round 5: `69b1ec469baeab940a2fed2a` (46.43 avg, 11.71% overall)

### Compare Command
```bash
node server/compare-runs.js <prevId> <newId>
```

---

## Emotional Context
Deeply satisfying detective work. The Counterspell bug was particularly gratifying to find — a subtle but devastating issue where the bard was spending resources for zero effect. The dragon flying bug in Round 4 was a "eureka moment" that explained months of poor dragon performance. Each round of optimization reveals deeper layers of the simulation's behavior.

## What Was Learned
- Always check spatial mechanics when melee attacks consistently fail
- Post-resolution reaction systems need full state snapshots, not partial undo logic
- Average dice testing reveals strategy flow; random dice reveals actual performance
- Action economy (number of enemies) matters more than raw HP in many scenarios
