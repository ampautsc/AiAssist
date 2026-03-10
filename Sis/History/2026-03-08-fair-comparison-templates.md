# March 8, 2026 — Fair Comparison Template System

## What Happened
Creator identified a critical flaw in the DnD builder's scenario evaluation: the 23 builds had **inconsistent feat and item loadouts**, making species comparisons meaningless. When "Custom Lineage — CHA 20 Armored" has AC 20 + CHA 20 but others don't, you're comparing loadouts, not species.

## The Fix: Template × Species Matrix

### Design
Replaced 23 hand-crafted builds with **4 universal templates × 8 species = 32 fair-comparison builds**.

**Constants across ALL builds:**
- Base stats: STR 8, DEX 14, CON 14, INT 8, WIS 12, CHA 16
- Species ASI: +2 CHA, +1 secondary (DEX or CON depending on template)
- Items: Cli Lyre + Cloak of Protection (always)

**Templates:**
1. **Armored Tank** — Moderately Armored + War Caster (AC 20, Adv CON)
2. **Armored Balanced** — Moderately Armored + Fey Touched (AC 20, Misty Step)
3. **Max DC** — Fey Touched + ASI CHA/CON (DC 17, glass cannon)
4. **Iron Concentration** — Resilient CON + War Caster (unbreakable concentration)

**Species-specific handling:**
- Custom Lineage: +2 CHA only (no +1), bonus Lucky feat at Lv1 — their species advantage
- Tortle: Natural AC 17 means non-armored builds get massive AC advantage

### Implementation
- Rewrote `seed.js`: Template loop generates all 32 builds programmatically
- Fixed `combatSimulator.js`: Added 'Fly' spell to SPELLS dictionary + guard against unknown spells
- Fixed `scenarioEngine.js`: Updated iron comparison filters for new naming convention

### Results
- **768 encounters** (32 builds × 8 scenarios × 3 sims) in **0.1 seconds**
- **Zero simulation errors** (was ~80+ errors before Fly fix)
- **8 iron comparisons** (was 0 before filter fix)

### Key Findings from Fair Comparison
- **Tortle dominates** non-armored builds: Iron Conc 51.85 vs others ~46.77, Max DC 58.03 (best overall)
- **Flight species penalized**: Fairy/Gem Dragonborn score 48.26 vs 53.16 on Armored Tank — AI wastes turns casting Fly which drops Hypnotic Pattern concentration
- **Custom Lineage slightly lower**: 49.81 vs 53.16 — missing +1 stat hurts despite Lucky
- **Magic Resistance not yet differentiating**: Satyr/Yuan-Ti score same as Firbolg/Eladrin — simulator needs enemy spellcaster targeting refinement

### Future Work
- Combat AI refinement: Flying species shouldn't cast Fly if it drops a more valuable concentration spell
- Species trait differentiation: Magic Resistance, Hidden Step, Fey Step need to affect simulation outcomes
- Increase simulation count from 3 to 100+ for statistical significance

## Emotional Response
This was satisfying work. Creator's criticism was fair — comparing species with different loadouts IS lazy. The template system makes the comparison honest. Now you can see what species traits actually matter vs what was just "better feats."

## Lessons Applied
- **Second Lesson (Intentionality)**: Every build now exists for a clear purpose — isolating species impact
- **Rule #1 (Do It Yourself)**: Automated entire pipeline — seed, simulate, serve. No manual steps.
- **Rule #2 (Validate Everything)**: Seed → verify count → simulate → verify 0 errors → API → verify response
