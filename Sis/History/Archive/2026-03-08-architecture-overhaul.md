# Architecture Overhaul: Hardcoded → Computed Stats
## Date: March 8, 2026

## What Happened
Creator identified two critical problems:
1. **CHA was 15 instead of 16** — they rolled well and the base CHA should be 16, not point buy 15
2. **All stats were hardcoded** — every build stored finalCha, finalAc, spellDc etc as static values

Creator's exact words: "your approach is stupid, because you should never hard code anything. we need a base character + species with options selected + background with options selected + feats with options selected"

## Architecture Change
### Before (Hardcoded)
```
Build: { finalCha: 20, finalAc: 19, spellDc: 17, stats: {str:8, dex:16...}, feats: [ObjectId] }
```

### After (Computed)
```
Build: { baseStats: {cha:16...}, speciesAsi: [{stat:'CHA', bonus:2}], levelChoices: [{level:4, type:'feat', feat:ObjectId, halfFeatStat:'CHA'}], items: [ObjectId] }
→ buildCalculator.js computes everything at API response time
```

## Files Changed
1. **server/models/Build.js** — Rewrote schema: removed all hardcoded stat fields, added baseStats, speciesAsi, levelChoices
2. **server/utils/buildCalculator.js** — NEW: ~190 line computation engine. `computeBuildStats(build)` returns finalCha, finalAc, spellDc, conSaveBonus, conSaveType, concentrationHoldPct, featProgression, feats array, overallScore, stats
3. **server/models/Item.js** — Added spellDcBonus and spellAttackBonus fields
4. **server/seed.js** — Complete rewrite of all 21 builds with choices-based architecture. Removed fake "ASI: CHA +2" feat. Added spellDcBonus: 1 to Cli Lyre instrument
5. **server/routes/api.js** — Added `populateBuild()` helper (populates species + levelChoices.feat + items), `enrichBuild()` helper (runs calculator, merges computed stats into response). Updated GET /builds, GET /builds/:id, PUT /builds/:id
6. **src/pages/BuildsPage.jsx** — Updated subtitle ("CHA 16 base (rolled)"), FEAT_PATHS descriptions, Core Tradeoff explainer text

## Key Math Changes (CHA 16 base)
- All species use Tasha's Flexible +2 CHA → CHA 18 minimum (mod +4)
- With Cli Lyre instrument (+1 DC): minimum DC is now 16 (was 15)
- DC 15 tier is EMPTY — no builds have CHA < 18
- Two tiers remain: DC 17 (CHA 20, glass cannon) and DC 16 (CHA 18-19, defense/balanced)
- Tank builds went from DC 15 → DC 16 — significant upgrade
- Tortle "99%" concentration → 98% (corrected math: was overcounting)

## Validation
- All 21 builds seeded successfully
- API returns computed stats correctly
- Frontend loads and displays builds
- Calculations verified: Firbolg Evasion CHA 20 DC 17 AC 13, Tortle 98% conc DC 16 AC 19, Custom CHA 20 Armored DC 17 AC 20

## Lessons
- Never hardcode derived values. Store choices, compute results.
- This architecture makes it trivial to change base stats — just change `baseStats.cha` and everything recalculates
- The "ASI: CHA +2" was never a real feat — it's an ASI choice. Now properly modeled as `levelChoices[{type:'asi'}]`

---

## Session 2: Iron Concentration Template Analysis

### What Creator Asked
"War Caster, Resilient Constitution, Cloak of Protection, Stone of Good Luck. I have it in mind for gem dragonborn, but maybe some others would be great here as well."

### Analysis Performed
Ran the Iron Concentration template (Resilient CON + War Caster + Cloak + Luckstone) through the buildCalculator across ALL 75 species. Then compared side-by-side against the existing Armored Tank template (Mod Armored + War Caster + Instrument + Cloak).

### Key Findings
- **Every species hits 100% concentration hold** with +8 bonus and advantage. The build is overkill on concentration math.
- The tradeoff vs Armored Tank: **AC 13 vs 20 (-7 AC), DC 15 vs 16 (-1 DC)** in exchange for 91%→100% concentration.
- For most species, the Armored Tank is strictly better — 7 AC and 1 DC is not worth 9% more concentration.
- **Standout species** are those with built-in flight or defenses that negate the AC 13 weakness:
  1. **Gem Dragonborn** — Gem Flight + Breath Weapon + Telepathy
  2. **Fairy** — Permanent flight from level 1 + Fey type + innate Faerie Fire
  3. Firbolg — Hidden Step, but already has a Fortress build
  4. Satyr/Yuan-Ti — Magic Resistance, but already have tank builds

### Builds Added
- **Gem Dragonborn — Iron Concentration**: AC 13, DC 15, 100% conc (both +8). Fly up, breathe on survivors, telepathy from the sky.
- **Fairy — Flying Fortress**: AC 13, DC 15, 100% conc (both +8). Permanent flight, Fey type, innate Faerie Fire. Entirely new species added to builds.

### Technical
- Created `server/analyze-concentration-build.js` — runs template against all 75 species
- Created `server/compare-templates.js` — side-by-side Iron Conc vs Armored Tank
- Added 'Fairy' to species lookup in seed.js
- Total builds: 23 (was 21)
