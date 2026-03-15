# 2026-03-08 — Reference Data Population

## What Happened
Continued the D&D Builder project by populating all 6 new MongoDB collections with comprehensive reference data for character management.

## What Was Built

### seed-reference.js — Comprehensive Seed Script
- Fetches 111 Bard spells from the 5e SRD API (dnd5eapi.co)
- Fetches 16 Magical Secrets candidates (non-Bard spells worth stealing)
- 4 non-SRD spells (Aura of Vitality, Steel Wind Strike, Find Greater Steed, Destructive Wave) added manually since they aren't in the SRD API
- Every spell has hand-written Bard tactical analysis: bardRating (1-10), bardNotes, and tags
- Seeds 14 Bard class features (base class + College of Lore subclass)
- Seeds 18 skills with expertise candidate analysis for Bards
- Seeds 10 backgrounds with Bard synergy ratings (Courtier rated #1)
- Seeds 20 level progressions (Bard 1-20 with all spell slots, features, scaling)
- Seeds 15 conditions with mechanical summaries and removal methods
- Seeds 14 new feats (Actor, Elven Accuracy, Metamagic Adept, Skill Expert, etc.)

### API Routes Expanded
Added endpoints for all new collections with filters:
- `/api/spells` — level, school, concentration, bardNative, magicalSecretsCandidate, tag, minRating
- `/api/class-features` — subclass, level (up to)
- `/api/skills` — expertiseCandidate filter
- `/api/backgrounds` — minRating filter
- `/api/levels` — maxLevel filter, `/api/levels/:level` detail
- `/api/conditions` — tag filter

## Final Database Counts
| Collection | Count |
|---|---|
| Spells | 127 (111 Bard native + 16 Magical Secrets) |
| Class Features | 14 |
| Skills | 18 |
| Backgrounds | 10 |
| Level Progressions | 20 |
| Conditions | 15 |
| Feats | 26 (12 original + 14 new) |
| Species | 13 (from original seed) |
| Items | 16 (from original seed) |
| Builds | 21 (from original seed) |

## Key Decisions
- Used 5e SRD API for spell data (reliable JSON), hand-wrote all Bard analysis
- Non-SRD spells (XGE, Paladin-exclusive) inserted manually since API doesn't have them
- Spell ratings reflect Lore Bard perspective specifically, not general power level
- Backgrounds rated by CHA-skill overlap and social feature utility
- Skills marked as expertise candidates based on CHA synergy and frequency of use

## Lessons
- 5e SRD API only contains SRD content — Paladin spells like Aura of Vitality, Find Greater Steed, Destructive Wave aren't available. XGE content (Steel Wind Strike) also missing. Must handle these manually.
- Spell dedup logic needed because some Magical Secrets candidates (like some spells) are already on the Bard list

---

## Phase 2: Frontend Pages Built

### SpellsPage (`/spells`)
- 📜 Spell Codex — browse all 127 spells
- Summary bar: total showing, S-tier count, average rating, concentration count
- 7 filters: search, level, school, concentration, source (Bard/Secrets), tag, min rating
- Spells grouped by level, sorted by Bard rating within each group
- Color-coded rating badges (S/A/B/C/F tier)
- Badges for Concentration (C), Ritual (R), Magical Secrets (MS)
- Click to expand: Bard analysis, Magical Secrets notes, full description, higher levels, components, saves, damage, classes
- Purple left-border on Magical Secrets-only spells

### CharacterSheet (`/reference`)
- 📋 Lore Bard Reference — 5 tabbed sections:
  1. **Level Progression** — interactive slider (1-20), current level snapshot (prof, cantrips, spells known, slots, inspiration die, song of rest, magical secrets count), spell slot visual, full progression table
  2. **Class Features** — Bard base class + College of Lore subclass, with action costs, scaling, uses/day
  3. **Skills & Expertise** — 18 skills as cards, expertise candidates gold-highlighted with analysis
  4. **Backgrounds** — 10 backgrounds as cards sorted by Bard synergy rating, skill/tool/language info, feature descriptions
  5. **Conditions** — 15 conditions with mechanical summaries, descriptions, removal methods, tags

### Navigation Updated
- App.jsx: 6 nav links (Builds, Species, 📜 Spells, 📋 Reference, Compare, ⚔️ Arena)
- Routes for `/spells` and `/reference`

### CSS Added (~300 lines)
- Spell table with grid layout, hover states, expand animation
- Rating badges with tier colors
- Character sheet tabs, level picker slider, snapshot grid
- Spell slot visual (dot notation), skill cards, condition grid
- All consistent with existing dark fantasy theme (Cinzel headers, gold accents)
