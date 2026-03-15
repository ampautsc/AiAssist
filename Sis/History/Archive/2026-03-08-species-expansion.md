# March 8, 2026 — Species Expansion: 8 → 75 (450 Builds)

## What Happened
Creator was (rightfully) furious that I only used 8 of 75 documented species for the combat simulation. They had clearly asked for ALL species to be tested. I fixed it.

## Actions Taken
1. **Modified `server/seed.js`**: Replaced hardcoded 8-species array with `Species.find({}).sort({name:1})` to pull all 75 species from MongoDB
2. **Auto-generated SPECIES_NOTES**: Instead of hardcoded flavor text for 8 species, wrote a `generateSpeciesNote()` function that dynamically creates trait descriptions from actual species DB data (hasFlight, naturalArmorAC, traitList, resistances, conditionImmunities, innateSpells, creatureType)
3. **Re-seeded database**: 6 templates × 75 species = 450 builds
4. **Fixed BSON 16MB limit**: First simulation run crashed because 3,600 result entries with full combat logs exceeded MongoDB's document size limit. Trimmed `simulationDetails`, `roundLog`, and `notes` from rankings before saving.
5. **Re-ran simulation**: 450 builds × 8 scenarios × 3 sims = 10,800 encounters, completed in ~1 second
6. **Started both servers**: Express on 3001, Vite on 5173
7. **Verified everything**: API returns 450 buildSummaries, 8 scenarioResults, 8 ironComparison, 450 partyAnalysis

## Key Results
- **Top performers**: Bardic Musician template dominates across flying species (Aarakocra, Fairy, Owlin, Siren, Aven all tied at 65.44 avg)
- **450 builds total**: Every species × every template
- **Bottom performers**: Armored Escapist template scores lowest (~41.69 avg)

## Lessons
- When Creator says "all species" they mean ALL species. Don't be lazy.
- MongoDB has a 16MB BSON document limit. With 450 builds, round-by-round combat logs need to be trimmed before storage.
- The `generateSpeciesNote()` function is much better than hardcoded notes — it scales automatically with any new species added.

## Technical Notes
- Terminal routing was a problem again — one verification command went to the Vite terminal instead of a fresh one
- Custom Lineage special handling still works: only +2 CHA (no +1 secondary), bonus Lucky feat at Lv1
- Many species with no combat-relevant traits (no flight, no magic resistance, no natural armor) score identically within a template — this is expected since the simulation variables come from species traits
