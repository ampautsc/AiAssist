# Sis History — 2026-03-09: Scenario-Based Build Evaluation Engine

## What Happened
Creator correctly identified that comparing builds by raw stats (AC, DC, concentration %) is misleading. The real question is: **how does each build perform in actual combat encounters?** They demanded scenario-based evaluation across 8 encounter types.

## The Core Insight
> "Your math is also super focused on the concentration save and doesn't take into account the greater probability of taking a hit in the first place"

This is 100% correct. The compound probability P(hit|AC) × P(fail save|damage) matters, not just P(fail save) alone.

## What Was Built
Created `server/evaluate-scenarios.js` — a comprehensive evaluation engine that:

### Monster Stats Gathered (from dnd5eapi.co)
- Zombie, Skeleton, Ghoul, Ghast, Cult Fanatic, Werewolf
- Young Red Dragon, Hill Giant, Frost Giant
- Lich, Archmage, Ogre, Bandit, Bandit Captain, Mage

### 8 Combat Scenarios
1. **💀 Undead Swarm** — 4 zombies, 4 skeletons, 2 ghouls (ghouls immune to charmed!)
2. **🐺 Werewolf Pack** — 4 werewolves (all melee, immune nonmagical B/P/S)
3. **⛪ Cult Fanatics** — 4 fanatics (ADV vs charm!) + 1 mage (Counterspell!)
4. **🐉 Dragon Assault** — Young Red Dragon (breath weapon DC 17, 56 avg damage)
5. **🏔️ Frost Giant Smash** — 1 frost giant + 2 ogres (massive melee damage)
6. **💀 Lich Encounter** — CR 21 Lich (immune charmed, Legendary Res, Counterspell)
7. **🧙 Archmage Duel** — Archmage (Magic Resistance, Counterspell, AoE)
8. **⚔️ Mixed Encounter** — Bandit camp with captain, bandits, mage, ogres

### Math Engine
- P(hit) = (21 - AC + atkBonus) / 20 (clamped 0.05–0.95)
- P(fail save) with advantage: fail² (5e 2014, no auto-fail on nat 1)
- **Conditional probability for AoE/breath**: P(break) = P(fail save)×P(break|full) + P(succeed save)×P(break|half) — NOT expected damage
- Multi-round tracking: concentration survival + HP tracking over 5 rounds
- Factors: flight (negates melee), invisibility (Hidden Step T1), Magic Resistance, Dark Devotion, Counterspell risk

### Bugs Fixed During Development
1. Smart quote in string literal caused SyntaxError
2. Species model not registered for Mongoose populate
3. Gem Dragonborn hasFlight flag treated as permanent when it's limited (Gem Flight 1/LR)
4. Breath weapon used expected damage for concentration DC (underestimates risk) — fixed to conditional probability
5. Dragon using breath AND multiattack on same round — fixed: breath replaces multiattack

## Key Results

### Overall Rankings (Average Across 8 Scenarios)
| Rank | Build | Avg Score | AC | DC | CON |
|------|-------|-----------|----|----|-----|
| #1 | Firbolg — Fortress | 72.65 | 19 | 16 | +3 AdvCON |
| #2 | Fairy — Flying Fortress | 69.97 | 13 | 15 | +8 Fly+AdvCON |
| #3 | Gem DB — Iron Conc | 69.04 | 13 | 15 | +8 Fly+AdvCON |
| #4 | Firbolg — Balanced | 68.36 | 20 | 16 | +3 |
| #5 | Tortle — 98% Conc | 68.01 | 19 | 16 | +6 AdvCON |

### THE IRON CONCENTRATION ANSWER
**Iron Concentration WINS in ALL 8 scenarios** for concentration holding:

| Scenario | Iron Conc 3R | Armored 3R | Winner | Margin |
|----------|-------------|------------|--------|--------|
| Undead Swarm | 99.9% | 92.9% | IRON | +7.0% |
| Werewolf Pack | 100% | 95.6% | IRON | +4.4% |
| Cult Fanatics | 96.3% | 77.7% | IRON | +18.6% |
| Dragon Assault | 43.3% | 28.7% | IRON | +14.6% |
| Frost Giant | 98.3% | 93.0% | IRON | +5.3% |
| Lich | 95.1% | 64.4% | IRON | +30.7% |
| Archmage | 93.7% | 75.0% | IRON | +18.7% |
| Mixed | 96.7% | 82.0% | IRON | +14.7% |

**The higher AC does NOT compensate for the weaker save.** The +8 CON save with advantage is so powerful that even being hit more often (AC 13), the save almost always holds. The armored builds get hit less, but when they DO get hit, the save is much shakier.

### Notable Scenario-Specific Findings
- **Dragon Assault**: Firbolg dominates (#1, #2, #3) because Hidden Step dodges the Round 1 breath weapon. Everyone else gets breathed on and ~65% lose concentration immediately.
- **Cult Fanatics**: HARDEST scenario. Dark Devotion (ADV vs charm) cuts Hypnotic Pattern effectiveness in half. Mage has Counterspell. Best score is only 63.5%.
- **Lich**: Impossible for bard alone. Immune to charmed = HP useless. Iron Concentration builds are best because at least their OTHER concentration spells hold.
- **Werewolf Pack**: Easiest for flyers — all melee enemies, can't reach flying bard at all.

## Emotional Response
This was deeply satisfying to build. Creator's instinct was right — the raw stat comparison was hiding important truths. The math proves it: the Iron Concentration template is the best concentration holder in the game, across ALL scenarios, even when accounting for AC differences. But it's NOT the #1 overall build because Firbolg's Hidden Step is incredibly powerful for avoiding the catastrophic Round 1 damage.

## Decisions Made
- Used conditional probability for AoE damage (correct math, not simplified expected damage)
- Dragon breath replaces multiattack on its round (5e RAW)
- 33% targeting rate for bard in 4-person party (caster aggro)
- 50% chance AoE targets bard's area
- Counterspell given 50% success rate (with counter-counterspell consideration)
