# DPR Calculator - Usage Guide

## Overview

The DPR (Damage Per Round) calculator is a test-driven calculation library that accurately models D&D 5e combat mechanics. All calculations have been validated against comprehensive test scenarios.

## Test Results

✅ **25/25 tests passing**

Validated mechanics:
- Ability modifiers and proficiency bonuses
- Attack bonus calculations with all modifiers
- Damage calculations (base, Sharpshooter, critical hits)
- Hit probability (normal, advantage, Elven Accuracy)
- Critical hit probability
- Multi-attack sequences
- Multi-round combat optimization

## Quick Start Example

```python
from utils.dpr_calculator import Attack, AttackSequence, MultiRoundCombat

# Level 8 Beast Master Ranger with Sharpshooter + Elven Accuracy
# Using pet Help action for advantage on first attack

# Attack 1: Sharpshooter with Elven Accuracy advantage
attack1 = Attack(
    ability_mod=4,              # DEX 18
    proficiency=3,              # Level 8
    weapon_damage_dice=8,       # Longbow (d8)
    magic_bonus=1,              # +1 Longbow
    fighting_style_to_hit=2,    # Archery Fighting Style
    magic_item_damage=2,        # Bracers of Archery
    sharpshooter=True,          # -5 to hit, +10 damage
    advantage=True,             # Pet Help action
    elven_accuracy=True         # Triple advantage
)

# Attack 2: Normal Sharpshooter attack
attack2 = Attack(
    ability_mod=4,
    proficiency=3,
    weapon_damage_dice=8,
    magic_bonus=1,
    fighting_style_to_hit=2,
    magic_item_damage=2,
    sharpshooter=True
)

# Calculate DPR for this round
sequence = AttackSequence([attack1, attack2])
result = sequence.calculate_round_dpr(target_ac=16)

print(f"Total DPR: {result['total_dpr']:.2f}")
print(f"Average hit chance: {result['average_hit_chance']*100:.1f}%")
```

**Output:**
```
Total DPR: 30.43
Average hit chance: 68.8%
```

## Core Classes

### `Attack`

Represents a single attack with all modifiers.

**Constructor Parameters:**
- `ability_mod` (int): Ability modifier (DEX or STR)
- `proficiency` (int): Proficiency bonus
- `weapon_damage_dice` (int): Die size (6, 8, 10, 12)
- `weapon_damage_count` (int): Number of dice (default 1)
- `magic_bonus` (int): Magic weapon bonus (applies to hit AND damage)
- `fighting_style_to_hit` (int): Bonus to hit from fighting style (Archery = +2)
- `fighting_style_damage` (int): Bonus to damage from fighting style
- `magic_item_damage` (int): Damage bonus from other items (Bracers = +2)
- `sharpshooter` (bool): Using Sharpshooter feat
- `advantage` (bool): Has advantage on this attack
- `elven_accuracy` (bool): Has Elven Accuracy feat (requires advantage)

**Methods:**
- `get_to_hit()` → int: Total attack bonus
- `get_damage_per_hit()` → float: Average damage on hit
- `get_hit_probability(target_ac)` → float: Probability to hit (0-1)
- `get_crit_probability()` → float: Probability to crit (0-1)
- `calculate_dpr(target_ac)` → dict: Complete DPR analysis

**DPR Result Dictionary:**
```python
{
    'to_hit': 5,                # Attack bonus
    'hit_chance': 0.875,        # 87.5% to hit
    'crit_chance': 0.1426,      # 14.26% to crit
    'damage_per_hit': 21.5,     # Average damage
    'crit_damage': 4.5,         # Extra crit damage
    'expected_damage': 19.45,   # Expected damage
    'dpr': 19.45                # Same as expected_damage
}
```

### `AttackSequence`

Represents multiple attacks in one round (Extra Attack, bonus actions).

**Constructor:**
```python
AttackSequence(attacks: List[Attack])
```

**Methods:**
- `calculate_round_dpr(target_ac)` → dict: Total DPR for all attacks

**Result Dictionary:**
```python
{
    'attacks': [             # Individual attack results
        {'to_hit': 5, 'dpr': 19.45, ...},
        {'to_hit': 5, 'dpr': 10.98, ...}
    ],
    'total_dpr': 30.43,      # Sum of all attacks
    'average_to_hit': 5.0,   # Average attack bonus
    'average_hit_chance': 0.6875,  # Average hit %
    'num_attacks': 2
}
```

### `MultiRoundCombat`

Represents combat over multiple rounds with different strategies per round.

**Constructor:**
```python
MultiRoundCombat(rounds: List[AttackSequence])
```

**Methods:**
- `calculate_total_damage(target_ac)` → dict: Total damage over all rounds

**Result Dictionary:**
```python
{
    'rounds': [              # Per-round results
        {'total_dpr': 30.43, 'attacks': [...]},
        {'total_dpr': 30.43, 'attacks': [...]},
        {'total_dpr': 30.43, 'attacks': [...]}
    ],
    'total_damage': 91.29,   # Sum across all rounds
    'average_dpr': 30.43,    # Average per round
    'num_rounds': 3
}
```

## Validated Test Scenarios

All scenarios tested with **Level 8 Beast Master Ranger** vs **AC 16**:
- DEX 18 (+4), Proficiency +3
- Sharpshooter feat, Elven Accuracy feat
- Archery Fighting Style (+2 to hit)
- +1 Longbow, Bracers of Archery (+2 damage)
- Extra Attack (2 attacks per action)
- Pet can use Help action (bonus action, gives advantage to 1 attack)

### Results (3-round combat)

| Scenario | Strategy | Total Damage | Avg DPR |
|----------|----------|--------------|---------|
| 1 | No feats, no help | 53.1 | 17.7 |
| 2 | Sharpshooter only | 65.85 | 21.95 |
| 3 | Help only (no SS) | 62.44 | 20.81 |
| **4** | **SS + Help (optimal)** | **91.29** | **30.43** |
| 5 | SS only on advantage | 84.91 | 28.30 |
| 6 | Help round 1 only | 74.33 | 24.78 |

**Optimal Strategy:** Use pet Help action every round + Sharpshooter on all attacks = **91.29 damage over 3 rounds**

## Key Mechanics Validated

### Elven Accuracy
- Normal advantage: Roll 2d20, take higher
- Elven Accuracy: Roll 3d20, take highest
- **Massive improvement** for Sharpshooter builds
  - Normal hit (SS): 50%
  - Advantage (SS): 75%
  - **Elven Accuracy (SS): 87.5%** ✨

### Critical Hits
- Normal: 5%
- Advantage: 9.75%
- Elven Accuracy: **14.26%**
- Doubles weapon dice only (not modifiers)

### Sharpshooter Trade-off
- -5 to hit penalty
- +10 damage bonus
- **Worth it when you have advantage + Elven Accuracy**
  - Without advantage: 21.95 DPR (marginal gain)
  - With Elven Accuracy: 30.43 DPR (massive gain)

### Auto-Hit/Auto-Miss
- Natural 20 always hits (even +0 vs AC 25)
- Natural 1 always misses (even +19 vs AC 5)
- Capped at 95% hit chance, 5% miss chance

## Helper Functions

```python
from utils.dpr_calculator import calculate_proficiency_bonus, calculate_ability_modifier

# Get proficiency bonus from level
prof = calculate_proficiency_bonus(8)  # Returns 3

# Get ability modifier from score
dex_mod = calculate_ability_modifier(18)  # Returns 4
```

## Running Tests

```bash
cd DnD
pytest tests/test_dpr_calculator.py -v
```

**Test Coverage:**
- ✓ Basic calculations (ability mods, proficiency)
- ✓ Attack bonuses (all modifiers)
- ✓ Damage calculations (normal, SS, crits)
- ✓ Hit probability (normal, advantage, Elven Accuracy)
- ✓ Crit probability
- ✓ All 6 test scenarios
- ✓ Multi-round optimization
- ✓ Strategy comparison

## Example: Comparing Strategies

```python
from utils.dpr_calculator import Attack, AttackSequence, MultiRoundCombat

# Define different strategies
strategies = {}

# Strategy 1: Always use Sharpshooter + Help
rounds_ss_help = []
for _ in range(3):
    attack1 = Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2,
                     magic_item_damage=2, sharpshooter=True,
                     advantage=True, elven_accuracy=True)
    attack2 = Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2,
                     magic_item_damage=2, sharpshooter=True)
    rounds_ss_help.append(AttackSequence([attack1, attack2]))

strategies['SS + Help'] = MultiRoundCombat(rounds_ss_help).calculate_total_damage(16)

# Strategy 2: Never use Sharpshooter
rounds_no_ss = []
for _ in range(3):
    attack1 = Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2,
                     magic_item_damage=2)
    attack2 = Attack(4, 3, 8, magic_bonus=1, fighting_style_to_hit=2,
                     magic_item_damage=2)
    rounds_no_ss.append(AttackSequence([attack1, attack2]))

strategies['No SS'] = MultiRoundCombat(rounds_no_ss).calculate_total_damage(16)

# Compare
for name, result in strategies.items():
    print(f"{name}: {result['total_damage']:.2f} damage ({result['average_dpr']:.2f} DPR)")
```

**Output:**
```
SS + Help: 91.29 damage (30.43 DPR)
No SS: 53.10 damage (17.70 DPR)
```

## Next Steps

This calculation library can now be used to:
1. ✅ Power the web UI build calculator
2. Build character optimization tools
3. Compare class/feat choices
4. Analyze spell DPR vs weapon attacks
5. Multi-round tactical planning
6. Level progression analysis

**Foundation is solid and test-validated!**
