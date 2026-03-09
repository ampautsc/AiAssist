# 2026-03-05 - MongoDB + React SPA for D&D Builder

## What Happened
Creator said the ABC build format in the text file was dumb and asked for a local MongoDB instance plus a React SPA to present character build options properly.

## Actions Taken
1. **Installed MongoDB 8.2.5** via winget — now running as Windows service
2. **Created full-stack project** at `DnD/dnd-builder/`:
   - Vite 5 + React 19 frontend
   - Express 4 + Mongoose 8 API backend
   - MongoDB database: `dnd-builder`
3. **Designed MongoDB schemas:**
   - **Species** — name, tier, traits, non-spell abilities, social kit, combat notes
   - **Feat** — name, half-feat status, stat bonus, tags, prerequisites
   - **Item** — name, rarity, slot, AC/save bonuses, requirements
   - **Build** — references Species + Feats + Items, computed stats (AC, CHA, DC, concentration%), archetype, ratings, combat loop, risks/rewards
4. **Seeded database** with: 12 feats, 16 items, 13 species (Tier 1-2), 21 builds (3 per finalist)
5. **Built React SPA with 3 views:**
   - **Builds Page** — filterable/sortable card grid of all 21 builds with stat blocks, ratings, feat/item tags
   - **Species Browser** — species cards with traits, non-spell abilities, social rating
   - **Species Detail** — full breakdown + builds comparison table
   - **Build Detail** — complete build info: philosophy, feat progression, items, combat loop, concentration protection, ability scores, ratings, risks/rewards
   - **Compare Page** — select up to 5 builds for side-by-side comparison table with highlighted bests
6. **Dark fantasy theme** with Cinzel headers, gold accents, tier badges, archetype color coding

## Architecture
```
DnD/dnd-builder/
├── server/
│   ├── index.js          — Express server, port 3001
│   ├── seed.js           — Database seeder
│   ├── routes/api.js     — REST endpoints
│   └── models/           — Mongoose schemas (Species, Feat, Item, Build)
├── src/
│   ├── main.jsx          — React entry
│   ├── App.jsx           — Router + nav
│   ├── api.js            — API client
│   ├── index.css         — Dark theme styles
│   └── pages/            — BuildsPage, SpeciesPage, SpeciesDetail, BuildDetail, ComparePage
├── .env                  — MongoDB URI + port
├── vite.config.js        — Proxy /api → localhost:3001
└── package.json          — Scripts: dev, client, server, seed
```

## Running
- API: `node DnD/dnd-builder/server/index.js` (port 3001)
- Frontend: `npx vite --port 5173` from DnD/dnd-builder/
- Seed: `node DnD/dnd-builder/server/seed.js`

## Key Decisions
- Express 4 (not 5) — Express 5 had issues with Node 20.11
- Vite 5 (not 7) — Vite 7 requires Node 20.19+
- Mongoose 8 (not 9) — Mongoose 9 requires Node 20.19+
- Started API as detached process via Start-Process (background terminal sharing caused issues)
- Vite proxy handles /api routing in dev mode

## Emotional Response
Creator was frustrated with the text file format. This is a much better way to explore and compare builds interactively. The data model supports future expansion — adding more species, builds, or entirely new character classes.
