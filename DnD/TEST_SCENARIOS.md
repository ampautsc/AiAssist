# DPR Calculation Test Scenarios

## Test Character: Level 8 Wood Elf Beast Master Ranger

### Character Stats
- **Race**: Wood Elf
- **Class**: Ranger (Beast Master)
- **Level**: 8
- **Dexterity**: 18 (+4 modifier)
- **Proficiency Bonus**: +3 (level 8)

### Features & Items
- **Sharpshooter Feat**: Optional -5 to hit, +10 damage
- **Elven Accuracy Feat**: When attacking with advantage, reroll one d20 (pick highest of 3 dice instead of 2)
- **Archery Fighting Style**: +2 to ranged attack rolls
- **Bracers of Archery**: +2 damage with bows
- **+1 Longbow**: +1 to hit, +1 damage, 1d8 damage
- **Extra Attack**: 2 attacks per Attack action (gained at Ranger level 5)

### Beast Companion
- **Help Action**: Bonus action to command pet to Help
- **Effect**: Gives advantage on ONE attack from ally (you) against target before pet's next turn
- **Cost**: Uses your bonus action
- **Duration**: Until your next attack (one attack gets advantage)

### Opponent
- **AC**: 16
- **Assumed**: No special resistances or vulnerabilities

## Attack Bonus Calculation

### Base Attack (no Sharpshooter)
- DEX modifier: +4
- Proficiency: +3
- Archery Fighting Style: +2
- +1 Longbow: +1
- **Total**: +10 to hit

### With Sharpshooter
- Base: +10
- Sharpshooter penalty: -5
- **Total**: +5 to hit

## Damage Calculation

### Per Hit (no Sharpshooter)
- Longbow: 1d8 (average 4.5)
- DEX: +4
- +1 Longbow: +1
- Bracers of Archery: +2
- **Total**: 1d8 + 7 (average 11.5)

### Per Hit (with Sharpshooter)
- Longbow: 1d8 (average 4.5)
- DEX: +4
- +1 Longbow: +1
- Bracers of Archery: +2
- Sharpshooter: +10
- **Total**: 1d8 + 17 (average 21.5)

## Hit Probability Calculations

### Normal Attack vs AC 16
- Need to roll: 16 - 10 = 6 or higher
- Probability: 15/20 = 75%
- **Includes**: Nat 20 always hits, nat 1 always misses

### Sharpshooter Attack vs AC 16
- Need to roll: 16 - 5 = 11 or higher
- Probability: 10/20 = 50%

### Advantage (Standard)
- Roll two d20s, take higher
- Probability formula: 1 - (miss_chance)²
- Normal attack (need 6+): 1 - (5/20)² = 1 - 0.0625 = 93.75%
- Sharpshooter (need 11+): 1 - (10/20)² = 1 - 0.25 = 75%

### Elven Accuracy (Triple Advantage)
- Roll three d20s, take highest
- Probability formula: 1 - (miss_chance)³
- Normal attack (need 6+): 1 - (5/20)³ = 1 - 0.015625 = 98.4375%
- Sharpshooter (need 11+): 1 - (10/20)³ = 1 - 0.125 = 87.5%

## Critical Hits
- Natural 20 on d20
- Doubles weapon damage dice (not modifiers)
- Longbow crit: 2d8 instead of 1d8
- Extra damage: 4.5 average (one extra d8)

### Crit Probability
- Normal: 1/20 = 5%
- Advantage: 1 - (19/20)² = 9.75%
- Elven Accuracy: 1 - (19/20)³ = 14.26%

## Tactical Scenarios for 3-Round Combat

### Scenario 1: No Sharpshooter, No Help
**Each Round:**
- Bonus Action: Nothing
- Action: Attack (2 attacks from Extra Attack)
- Attack 1: +10 to hit, normal roll
- Attack 2: +10 to hit, normal roll

**Per Round DPR:**
- Attack 1: 0.75 hit × 11.5 damage + 0.05 crit × 4.5 = 8.625 + 0.225 = 8.85
- Attack 2: Same = 8.85
- **Total: 17.7 DPR**
- **3 Rounds: 53.1 damage**

### Scenario 2: Sharpshooter, No Help
**Each Round:**
- Bonus Action: Nothing
- Action: Attack with Sharpshooter (2 attacks)
- Attack 1: +5 to hit, normal roll
- Attack 2: +5 to hit, normal roll

**Per Round DPR:**
- Attack 1: 0.50 hit × 21.5 damage + 0.05 crit × 4.5 = 10.75 + 0.225 = 10.975
- Attack 2: Same = 10.975
- **Total: 21.95 DPR**
- **3 Rounds: 65.85 damage**

### Scenario 3: No Sharpshooter, Pet Helps Every Round
**Each Round:**
- Bonus Action: Command pet to Help
- Action: Attack (2 attacks)
- Attack 1: Advantage (Elven Accuracy), +10 to hit
- Attack 2: Normal, +10 to hit

**Per Round DPR:**
- Attack 1 (Elven Accuracy advantage): 0.984375 hit × 11.5 + 0.1426 crit × 4.5 = 11.320 + 0.642 = 11.962
- Attack 2 (normal): 0.75 × 11.5 + 0.05 × 4.5 = 8.85
- **Total: 20.812 DPR**
- **3 Rounds: 62.436 damage**

### Scenario 4: Sharpshooter, Pet Helps Every Round
**Each Round:**
- Bonus Action: Command pet to Help
- Action: Attack with Sharpshooter (2 attacks)
- Attack 1: Elven Accuracy advantage, +5 to hit
- Attack 2: Normal, +5 to hit

**Per Round DPR:**
- Attack 1 (Elven Accuracy advantage): 0.875 hit × 21.5 + 0.1426 crit × 4.5 = 18.8125 + 0.642 = 19.4545
- Attack 2 (normal): 0.50 × 21.5 + 0.05 × 4.5 = 10.975
- **Total: 30.4295 DPR**
- **3 Rounds: 91.289 damage**

### Scenario 5: Mixed Strategy - Sharpshooter Only on Advantaged Attack
**Each Round:**
- Bonus Action: Command pet to Help
- Action: Attack (2 attacks)
- Attack 1: Sharpshooter ON, Elven Accuracy advantage, +5 to hit
- Attack 2: Sharpshooter OFF, normal, +10 to hit

**Per Round DPR:**
- Attack 1 (Sharpshooter + Elven Accuracy): 0.875 × 21.5 + 0.1426 × 4.5 = 19.4545
- Attack 2 (normal, no Sharpshooter): 0.75 × 11.5 + 0.05 × 4.5 = 8.85
- **Total: 28.3045 DPR**
- **3 Rounds: 84.914 damage**

### Scenario 6: Help on Round 1 Only, Then Full Sharpshooter
**Round 1:**
- Bonus Action: Help
- Attack 1: Sharpshooter + Elven Accuracy advantage = 19.4545
- Attack 2: Sharpshooter normal = 10.975
- Total: 30.4295

**Rounds 2-3:**
- Bonus Action: Nothing
- Attack 1: Sharpshooter normal = 10.975
- Attack 2: Sharpshooter normal = 10.975
- Total per round: 21.95

**3 Rounds: 30.4295 + 21.95 + 21.95 = 74.329 damage**

## Expected Results Summary

| Scenario | Strategy | Round 1 | Round 2 | Round 3 | Total | Avg DPR |
|----------|----------|---------|---------|---------|-------|---------|
| 1 | No SS, No Help | 17.7 | 17.7 | 17.7 | 53.1 | 17.7 |
| 2 | SS, No Help | 21.95 | 21.95 | 21.95 | 65.85 | 21.95 |
| 3 | No SS, Help Every Round | 20.812 | 20.812 | 20.812 | 62.436 | 20.812 |
| 4 | SS + Help Every Round | 30.43 | 30.43 | 30.43 | 91.29 | 30.43 |
| 5 | SS Only on Advantage | 28.30 | 28.30 | 28.30 | 84.91 | 28.30 |
| 6 | Help Round 1 Only | 30.43 | 21.95 | 21.95 | 74.33 | 24.78 |

## Optimal Strategy
**Scenario 4** (Sharpshooter + Help Every Round) yields the highest total damage: **91.29 over 3 rounds**

## Key Insights to Test
1. Elven Accuracy significantly improves Sharpshooter reliability (87.5% vs 75% advantage, vs 50% normal)
2. Using Help action on advantaged Sharpshooter attacks is optimal when Elven Accuracy is available
3. Without advantage, Sharpshooter is marginal improvement (21.95 vs 17.7)
4. With Elven Accuracy advantage, Sharpshooter is massive improvement (30.43 vs 20.81)
5. The bonus action trade-off (Help vs nothing) is worth it when Elven Accuracy is in play

## Test Requirements

### Unit Tests Should Verify:
1. ✓ Hit probability calculations (normal, advantage, Elven Accuracy)
2. ✓ Crit probability calculations (normal, advantage, Elven Accuracy)
3. ✓ Damage per hit (with/without Sharpshooter, with/without crits)
4. ✓ Attack bonus calculations (all modifiers stacking correctly)
5. ✓ DPR per attack (expected value including crits)
6. ✓ Multi-attack DPR (2 attacks with Extra Attack)
7. ✓ Mixed strategies (different tactics per attack)
8. ✓ Multi-round optimization

### Edge Cases to Test:
- Natural 1 always misses (even with +10 to hit vs AC 5)
- Natural 20 always hits (even with +0 to hit vs AC 25)
- Crit damage only doubles dice, not modifiers
- Elven Accuracy only works when you have advantage
- Help action gives advantage to only ONE attack
