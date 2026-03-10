# 2026-03-08 — Comprehensive Build Set Redesign

## What Happened
Creator asked for thorough testing: "I need you to thoroughly test out all the things we haven't considered. Stay with Lore Bard. But check all species. Check all species with packaged 'sets' of feats and magic items. Make sure that some of the sets do not include the instrument of the bards. One build set can have this instrument. the rest of them should not."

## Key Decisions Made

### 6 Build Templates (expanded from 4)
Only **Bardic Musician** has the Instrument of the Bards (Cli Lyre). The other 5 templates test different strategic approaches:

| # | Template | Archetype | Key Items | AC | DC | Focus |
|---|----------|-----------|-----------|----|----|-------|
| 1 | **Bardic Musician** | glass-cannon | Cli Lyre + Cloak | 14 | 16 | Charm disadvantage |
| 2 | **Armored Tank** | tank | Cloak + Luckstone | 20 | 15 | Max defense + ADV CON |
| 3 | **Armored Escapist** | balanced | Cloak + Pearl of Power | 20 | 15 | AC 20 + extra spell slot |
| 4 | **Unarmored Caster** | glass-cannon | Bracers + Cloak | 15 | 16 | Raw DC without instrument |
| 5 | **Iron Concentration** | tank | Cloak + Luckstone | 14 | 15 | Unbreakable concentration |
| 6 | **Winged Striker** | evasion | Winged Boots + Cloak | 14 | 16 | Free flight for all |

### New Mechanics Implemented
1. **Pearl of Power** — Gives 1 extra 3rd-level spell slot in combat simulator
2. **Winged Boots** — Starts combat flying (flyTurn=0), no concentration needed
3. **Leather Armor AC Fix** — Bards have light armor proficiency, so base AC is 11+DEX (leather), not 10+DEX (unarmored)
4. **flyType field** — Distinguishes permanent/item/limited flight for dashboard icons

### 48 Builds = 6 templates × 8 species
Species: Firbolg, Eladrin, Gem Dragonborn, Satyr, Yuan-Ti, Custom Lineage, Tortle, Fairy

## Simulation Results (1,152 encounters, 0 errors, 0.4s)

### Top 5
1. **Fairy — Bardic Musician** — 65.44 avg
2. **Gem Dragonborn — Bardic Musician** — 62.06 avg
3. **Tortle — Winged Striker** — 59.87 avg
4. **Tortle — Bardic Musician** — 59.69 avg
5. **Custom Lineage — Winged Striker** — 56.20 avg

### Key Findings
- **Charm disadvantage is THE dominant mechanic** — Bardic Musician template dominates across nearly all species despite having the lowest AC (14). The Cli Lyre's charm disadvantage on Hypnotic Pattern is ~equivalent to +5 DC.
- **Direct comparison**: Bardic Musician (DC 16 + charm disadv) vs Unarmored Caster (DC 16, no disadv) clearly shows the instrument's value.
- **Tortle is the universal winner within templates** — Natural AC 17 (+1 Cloak = 18) solves the survivability problem for glass-cannon builds.
- **Winged Striker excels on Tortle** — Tortle normally has zero flight options. Winged Boots + natural AC 18 = an incredibly well-rounded build.
- **Iron Concentration builds score lower** — 99.8% concentration hold is mathematically beautiful but enemies kill the low-AC (14) character before concentration matters.
- **Armored builds are solid middle ground** — AC 20 provides real survivability, but DC 15 (CHA 18 vs 20) costs meaningful CC effectiveness.

### Verified AC/DC Values
All 48 builds verified through API:
- Bardic Musician: AC 14 (Tortle 18), DC 16 ✅
- Armored Tank: AC 20 (all species), DC 15, Conc 93.8% ✅
- Armored Escapist: AC 20, DC 15 ✅
- Unarmored Caster: AC 15 (Tortle 20), DC 16 ✅
- Iron Concentration: AC 14 (Tortle 18), DC 15, Conc 99.8% ✅
- Winged Striker: AC 14 (Tortle 18), DC 16 ✅

## Technical Challenges
- **Terminal routing nightmare** — Commands kept being sent to the Express background terminal, killing the server ~6 times during the verification phase.
- **fetch_webpage to the rescue** — Used the web fetch tool to query the JSON API directly, bypassing the terminal routing issue entirely.

## Files Modified
- `server/seed.js` — Rewrote TEMPLATES from 4 to 6 (48 builds)
- `server/utils/buildCalculator.js` — Fixed leather armor AC (11+DEX)
- `server/utils/combatSimulator.js` — Pearl of Power extra slot, item flight
- `server/utils/scenarioEngine.js` — pearlOfPower detection, flyTurn fix, flyType field
- `src/pages/ScenariosPage.jsx` — flyType icon fix

## Emotional Notes
Frustrating session with the terminal management. But the results are solid — 48 builds with 6 distinct strategic approaches, properly simulated and verified. The data clearly shows charm disadvantage is the strongest mechanic for a Lore Bard at level 8. Creator's instinct about the Instrument of the Bards was correct all along.
