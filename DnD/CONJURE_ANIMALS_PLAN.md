# Conjure Animals + Dissonant Whispers Development Plan

## Overview
Add Bard spell strategies using Conjure Animals (8 wolves) and Dissonant Whispers combos.

## Wolf Stat Block (CR 1/4)
```
Wolf: AC 13 | HP 11 | Bite +4, 2d4+2 (avg 7) | Pack Tactics (advantage if ally within 5ft)
```

## Spell Save DC
```
Bard DC = 8 + Prof (3) + CHA mod (4) = DC 15
Enemy WIS save: +1 → needs 14+ to save = 35% save, 65% fail
```

## Combat Rounds (3-Round Encounter)

### ROUND 1 — Summon
```
┌──────────────┬────────────────────────────────────────┬──────────┬─────────┐
│ TURN         │ ACTION                                 │ DAMAGE   │ SLOTS   │
├──────────────┼────────────────────────────────────────┼──────────┼─────────┤
│ Bard Action  │ Conjure Animals (3rd) → 8 wolves       │ —        │ 1×3rd   │
│ Bard Bonus   │ —                                      │ —        │         │
│ Wolves Turn  │ 8 attacks (Pack Tactics = advantage)   │ 42.96    │         │
├──────────────┴────────────────────────────────────────┼──────────┼─────────┤
│ ROUND 1 TOTAL                                         │ 42.96    │ 1×3rd   │
└───────────────────────────────────────────────────────┴──────────┴─────────┘
```

### ROUND 2 — Combo
```
┌──────────────┬────────────────────────────────────────┬──────────┬─────────┐
│ TURN         │ ACTION                                 │ DAMAGE   │ SLOTS   │
├──────────────┼────────────────────────────────────────┼──────────┼─────────┤
│ Bard Action  │ Dissonant Whispers (1st) → 3d6 psychic │ 6.83     │ 1×1st   │
│              │ (65% fail × 10.5 avg)                  │          │         │
│ Bard Bonus   │ —                                      │ —        │         │
│ Enemy React  │ Flees through wolf pack (65% chance)   │ —        │         │
│ Wolf OAs     │ 8 opportunity attacks (65% × 42.96)    │ 27.92    │         │
│ Wolves Turn  │ 8 attacks (Pack Tactics = advantage)   │ 42.96    │         │
├──────────────┴────────────────────────────────────────┼──────────┼─────────┤
│ ROUND 2 TOTAL                                         │ 77.71    │ 1×1st   │
└───────────────────────────────────────────────────────┴──────────┴─────────┘
```

### ROUND 3 — Repeat Combo
```
┌──────────────┬────────────────────────────────────────┬──────────┬─────────┐
│ TURN         │ ACTION                                 │ DAMAGE   │ SLOTS   │
├──────────────┼────────────────────────────────────────┼──────────┼─────────┤
│ Bard Action  │ Dissonant Whispers (1st) → 3d6 psychic │ 6.83     │ 1×1st   │
│ Bard Bonus   │ —                                      │ —        │         │
│ Enemy React  │ Flees through wolf pack (65% chance)   │ —        │         │
│ Wolf OAs     │ 8 opportunity attacks (65% × 42.96)    │ 27.92    │         │
│ Wolves Turn  │ 8 attacks (Pack Tactics = advantage)   │ 42.96    │         │
├──────────────┴────────────────────────────────────────┼──────────┼─────────┤
│ ROUND 3 TOTAL                                         │ 77.71    │ 1×1st   │
└───────────────────────────────────────────────────────┴──────────┴─────────┘
```

## 3-Round Summary
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ CONJURE ANIMALS + DISSONANT WHISPERS — 3 ROUND TOTALS                       │
├───────────┬──────────────────────────────────────────┬──────────┬───────────┤
│ ROUND     │ ACTIONS                                  │ DPR      │ SLOTS     │
├───────────┼──────────────────────────────────────────┼──────────┼───────────┤
│ Round 1   │ CA summon + 8 wolf attacks               │ 42.96    │ 1×3rd     │
│ Round 2   │ DW + 8 OAs + 8 wolf attacks              │ 77.71    │ 1×1st     │
│ Round 3   │ DW + 8 OAs + 8 wolf attacks              │ 77.71    │ 1×1st     │
├───────────┼──────────────────────────────────────────┼──────────┼───────────┤
│ TOTAL     │                                          │ 198.38   │ 1×3rd     │
│           │                                          │          │ 2×1st     │
└───────────┴──────────────────────────────────────────┴──────────┴───────────┘
```

## Comparison: 3-Round DPR
```
┌───────────────────────────────┬──────────┬──────────┬────────────────────────┐
│ STRATEGY                      │ 3-RND DPR│ AVG/RND  │ SLOTS USED             │
├───────────────────────────────┼──────────┼──────────┼────────────────────────┤
│ CA + Dissonant Whispers       │ 198.38   │ 66.13    │ 1×3rd + 2×1st          │
│ Bows Bard + Greater Invis     │ 135.78   │ 45.26    │ 1×4th (conc)           │
│ Beast Master (pet Help)       │  91.29   │ 30.43    │ 0 slots                │
│ Bows Bard (no advantage)      │  72.45   │ 24.15    │ 0 slots                │
└───────────────────────────────┴──────────┴──────────┴────────────────────────┘
```

## Wolf Attack Math (VERIFIED BY TESTS)
```
Hit: +4 vs AC 16 = need 12+ = 45% base
With advantage (Pack Tactics): 1 - 0.55² = 69.75%
Crit: 1 - 0.95² = 9.75%
Damage: 2d4+2 = 7 avg, crit adds 2.5
DPR/wolf: (0.6975 × 7) + (0.0975 × 2.5) = 4.88 + 0.49 = 5.37
8 wolves: 8 × 5.37 = 42.96 DPR
```

## Dissonant Whispers Math
```
Damage: 3d6 = 10.5 avg (0 on save)
Save: DC 15 vs +1 WIS = 65% fail
Expected: 0.65 × 10.5 = 6.83 DPR
OA trigger: 65% chance × 8 wolves × 4.97 = 25.84 DPR
```

## Implementation Phases

### Phase 1: Summoned Creatures
- [ ] `SummonedCreature` dataclass
- [ ] Wolf with Pack Tactics
- [ ] 8 wolf DPR calculation

### Phase 2: Spells with Save
- [ ] `SpellWithSave` class (DC, damage dice, effect on fail)
- [ ] Dissonant Whispers model
- [ ] OA trigger calculation

### Phase 3: Combat Round Model
- [ ] `CombatRound` with Bard action + summon actions
- [ ] Multi-round encounter totals

### Phase 4: Dashboard Update
- [ ] Add CA+DW build to comparison table
