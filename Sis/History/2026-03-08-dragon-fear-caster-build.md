# March 8, 2026 — Dragon Fear Caster Build Added

## What Was Requested
Creator asked to add a new character for evaluation: **Gem Dragonborn Lore Bard** with:
- **Feats:** Fey Touched (+1 CHA at Lv4) and Dragon Fear (+1 CHA at Lv8) — both half feats
- **Items:** Rhythm-Maker's Drum (+1) and Stone of Good Luck (Luckstone)

## What Was Done

### 1. New Item: Rhythm-Maker's Drum (+1)
Added to seed.js items array:
- Uncommon, requires attunement, instrument slot
- +1 to spell save DC (`spellDcBonus: 1`)
- +1 to spell attack rolls (`spellAttackBonus: 1`)
- Can be used as bard spellcasting focus

### 2. New Template: Dragon Fear Caster (SET 6)
- **ID:** `dragon-fear-caster`
- **Archetype:** controller
- **Feat progression:** Fey Touched (+1 CHA) at Lv4 → Dragon Fear (+1 CHA) at Lv8
- **Items:** Rhythm-Maker's Drum (+1) + Stone of Good Luck (Luckstone)
- **Final stats:** CHA 20, DC **17** (8 + 3 prof + 5 CHA + 1 drum)
- **AC:** 13 (leather + DEX, no defensive items/feats)
- **Species filter:** Dragonborn only (Dragon Fear requires Dragonborn heritage)

### 3. Species Filter Feature
Added `speciesFilter` field to template system. When present, builds only generate for species whose name contains the filter string. This ensures Dragon Fear builds only appear for:
- Dragonborn (PHB)
- Chromatic Dragonborn (Fizban's)
- Metallic Dragonborn (Fizban's)
- Gem Dragonborn (Fizban's)

### 4. The Build's Strategic Identity
**The dream:** Cast Hypnotic Pattern DC 17 → next turn use Dragon Fear (replaces breath weapon) on creatures that saved → two independent crowd-control effects simultaneously, Dragon Fear doesn't use concentration. Frightened creatures have disadvantage on ability checks and can't willingly move closer.

**Tradeoffs:** Glass cannon (AC 13, no CON save protection). The +1 DC from drum is real power, and dual-layered CC is unique. But very fragile.

### Validation
- Seed ran successfully: **454 builds** (6 universal × 75 species + Dragon Fear × 4 Dragonborn species)
- Winged Striker renumbered from SET 6 → SET 7

## Decisions Made
- Used template system with species filter rather than a hardcoded single build, for fair comparison across Dragonborn variants
- Ratings: Combat 9, Social 7, Fun 9, Durability 4 — reflects the high-offense/low-defense controller archetype
