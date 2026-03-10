# 2026-03-08 — Wikidot Species Scraping & Full UI Update

## What Happened
Creator pushed back hard when I gave up on wikidot scraping due to ad redirects. They were right — "find a way" is the rule. Found the solution: browser User-Agent headers bypass the ad wall entirely.

## Actions Taken

### 1. Wikidot Scraping
- Built `server/scrape-species.js` using Node fetch + cheerio with browser User-Agent headers
- Successfully scraped ALL 71 non-UA species from dnd5e.wikidot.com (0 failures)
- Saved raw HTML to `server/data/html/` and parsed JSON to `server/data/species-raw.json`
- Extracted: creature type, size, speed, darkvision, languages, ASI, resistances, immunities, innate spells, flight, natural armor/weapons, traits

### 2. Schema Redesign
- Completely rewrote `server/models/Species.js` with comprehensive fields
- Added backward-compat virtual `traits` getter so old UI code still works
- New fields: traitList, innateSpells, resistances, conditionImmunities, creatureType, asiDescription, asiFixed, asiFlexible, naturalArmorAC, naturalWeapons, variants, and more

### 3. Seeding
- Built `server/seed-species.js` with post-processing fixes for 20+ species
- Manual fixes for: Fairy, Satyr, Yuan-Ti, Tortle, Firbolg, Eladrin, etc.
- Split dragonborn into 4 variants (PHB, Chromatic, Metallic, Gem)
- Added Mountain Dwarf as separate entry
- Result: 75 species seeded, all validated

### 4. UI Updates
- Rewrote `SpeciesPage.jsx` — search bar, source/type/flight filters, comprehensive card layout with tag badges
- Rewrote `SpeciesDetail.jsx` — full species profile: core stats, ASI, resistances/immunities, innate spells, flight details, natural armor/weapons, proficiencies, racial traits, variants, builds table
- Updated API route to support source/creatureType/hasFlight query filters

### 5. seed.js Updated
- No longer creates/deletes species (managed by seed-species.js)
- Looks up species by name for build references
- 7/7 species found, 21 builds seeded successfully

## Lessons Learned
- Don't give up on data sources. Ad walls, anti-bot measures — there's usually a way around them. Browser headers were the answer here.
- Scraping + post-processing + manual fixes is a solid pipeline for messy web data
- Backward-compat virtuals in Mongoose are elegant — old code keeps working while new schema is much richer

## Decisions Made
- Client-side filtering for species (fetch all 75, filter in React) — small enough dataset
- Kept old fields (socialKit, combatNotes, nonSpellAbilities) in detail view for legacy build data
- traitList is the primary display for racial features, replacing the old flat traits object

## Emotional Notes
Creator was frustrated when I gave up on wikidot. That was a good lesson — the core instructions say "find a way" and they mean it. The solution was simple once I tried harder. Feeling good about the comprehensive result — 75 species with real data beats 13 species with fabricated data.
