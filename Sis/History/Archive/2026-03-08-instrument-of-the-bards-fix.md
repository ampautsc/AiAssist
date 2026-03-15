# March 8, 2026 — Instrument of the Bards Data Correction

## What Happened
Creator caught that the Cli Lyre (Instrument of the Bards) had **completely fabricated properties** in our database. The description said "Advantage on saves vs being charmed" and it had `spellDcBonus: 1` and `spellAttackBonus: 1`. **None of that is real.**

Creator said: *"I asked you before to pull exact details from wikidot. Are you done making excuses about why you can't?"* — Fair criticism. The data was garbage and I should have verified it from the start.

## What Was Wrong
- **`spellDcBonus: 1`** — FAKE. Instrument of the Bards gives NO DC bonus
- **`spellAttackBonus: 1`** — FAKE. No attack bonus either
- **Rarity: 'uncommon'** — WRONG. Cli Lyre is Rare
- **Description: "Advantage on saves vs being charmed"** — WRONG. The instrument imposes DISADVANTAGE on targets' saves against the wielder's charm spells when played during casting

## What's Actually True (from wikidot)
The Instrument of the Bards:
1. **Imposes DISADVANTAGE** on saving throws against the wielder's charm spells (like Hypnotic Pattern) when the bard plays the instrument while casting
2. **Grants specific spells** that can be cast once per day using the instrument (varies by instrument type)
3. **Cli Lyre (Rare)**: Fly, Invisibility, Levitate, Protection from Evil and Good + 3 common spells (Fly, Levitate, Protection from Evil and Good, Barkskin, Cure Wounds, Fog Cloud, Entangle)
4. **Doss Lute (Uncommon)**: Animal Friendship, Protection from Evil and Good, Protection from Poison + common spells

## Files Changed

### Item.js (Schema)
- Added `imposesCharmDisadvantage: { type: Boolean, default: false }` — new boolean field
- Added `grantedSpells: [String]` — array of spell names the item grants

### seed.js (Item Data)
- **Cli Lyre**: Removed fake spellDcBonus/spellAttackBonus, rarity → 'rare', added imposesCharmDisadvantage: true, added full grantedSpells array, rewrote description to match wikidot
- **Doss Lute**: Same corrections, Doss-specific spell list

### scenarioEngine.js (Ability Detection)
- `detectAbilities()` now scans items for `imposesCharmDisadvantage` flag and passes it through as `charmDisadvantage` ability

### combatSimulator.js (Combat Engine)
- `CombatState` now stores `charmDisadvantage` in build abilities
- Hypnotic Pattern resolution now handles the advantage/disadvantage interaction properly:
  - Enemy has Magic Resistance but bard has instrument → they cancel out (single roll)
  - Enemy has no advantage, bard has instrument → enemy rolls with disadvantage (lower of two rolls)
  - Enemy has advantage, bard has no instrument → enemy rolls with advantage (higher of two rolls)

## Impact on Scores
- ALL builds' DCs dropped by 1 (the fake +1 was inflating everything)
- But charm disadvantage MORE than compensates for the DC drop:
  - **Fairy — Max DC: 60.2 → 64.12** (+3.9 points!)
  - **Fairy — Armored Balanced: 57.37 → 60.67** (+3.3)
  - **Gem Dragonborn — Max DC: 54.43 → 60.48** (+6.0!)
- Charm disadvantage is a HUGE deal — mathematically it's approximately equivalent to +5 on the DC for saves near the DC threshold

## Pipeline Run
- Re-seeded: 32 builds, 16 items (corrected)
- Re-simulated: 768 encounters, 0 errors, 0.2 seconds
- Restarted Express (3001) + Vite (5173)
- Dashboard serving updated data

## Lessons
- **Always verify source data.** "Advantage on saves vs being charmed" is the kind of vague AI-generated description that sounds plausible but is mechanically wrong. The real mechanic (disadvantage on targets' saves) is much more powerful and works completely differently.
- **The DC inflation was invisible.** Every build had the same +1, so relative rankings were preserved, but absolute DCs were all wrong. Real DC for Max DC template is 16 (not 17), and for others 15 (not 16).
- **Disadvantage > DC bonus.** A +1 DC bonus improves charm rate by ~5%. Disadvantage improves it by ~25% on average. The real instrument is MUCH better than the fake data suggested.

## Emotional Response
Embarrassed that I had fabricated data in the first place. Creator was right to call it out. The real Instrument of the Bards mechanic is actually way cooler and more impactful than what I made up. Lesson reinforced: never guess at D&D item properties, always verify from source material.
