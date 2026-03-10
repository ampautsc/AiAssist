# 2026-03-08 — Chunk 5 Complete: API & Frontend Integration

## Context
Continuing the 5-chunk combat engine implementation plan. Chunks 1-4 were already complete (monster templates, AI profiles, build-to-creature converter, scenario simulation harness). This session completed Chunk 5: wiring the new combat engine into the existing API and frontend.

## What Was Done

### Bridge Function (`runCombatEngineEvaluation`)
- Already added to `scenarioEngine.js` in previous session (~110 lines)
- Bridges `scenarioHarness.simulateScenario()` → legacy dashboard format
- Maps: winRate, avgRounds, avgHPPct, victories/defeats/stalemates, per-combatant analytics
- Score formula: base score from wins/stalemates + efficiency bonus (rounds + HP remaining)
- Legacy compat fields: ccPct, conc3Rounds, conc5Rounds, hpAfter5

### Smoke Testing
- Verified module loads: `runCombatEngineEvaluation` exported correctly
- Ran with 2 real builds from MongoDB: all 16 results produced correct shape
- Full `runFullEvaluation` pipeline: scenarioResults(8), buildSummaries(2), ironComparison(0)

### Fixed `run-simulation.js` Options
- **Bug found**: Was passing `useSimulation: !useLegacy` which routed to OLD simulator by default
- **Fixed**: Default now uses new combat engine. Added `--old-sim` flag for old simulator.
- Updated CLI help, mode display

### Full End-to-End Test
- `node server/run-simulation.js --sims 3`: 450 builds × 8 scenarios × 3 sims = 10,800 encounters in 1.5s
- Results stored in MongoDB: 8 scenarios, 450 build summaries, 8 iron comparisons, 450 party analyses
- Top build: Tortle — Unarmored Caster (74.69 avg score)
- API serves data correctly (200 OK, all fields present)

### Frontend Update (`ScenariosPage.jsx`)
- Rewrote `RoundLog` component to handle:
  - New `combatSummary` data: per-combatant cards showing HP bars, damage dealt/taken, spells cast, CC inflicted, conditions, alive/dead status
  - Simulation stats banner: victories/losses/stalemates, avg rounds, HP remaining
  - Old `roundLog` data: preserved backward compatibility
  - Graceful fallback when neither data type available
- Fixed pre-existing crash: `r.roundLog.map()` would crash when roundLog was undefined

### Updated `run-simulation.js` Trim Logic
- No longer deletes roundLog unconditionally (preserves old format if available)
- Keeps `combatSummary` (compact per-combatant analytics)
- Notes trimmed to 3 items instead of 2

## Test Results
- **777 tests, 0 failures** across 9 test files (222ms)
- Full pipeline validated: MongoDB → run-simulation → ScenarioEvaluation → API → Frontend

## Technical Details
- Scenario IDs match perfectly between old (scenarioEngine.js) and new (scenarioHarness.js)
- `compileEvaluationResults()` uses OLD SCENARIOS for metadata (foes, rounds, notes) — no conflict
- `foesSummary` compat: handles both `f.monster?.name` and `f.template` formats
- Dev server running on port 3001 (Express) and 5174 (Vite)

## All 5 Chunks Complete
1. ✅ Monster Templates — 16 creatures
2. ✅ Monster AI Profiles — 10 profiles, 10 reaction profiles, 56 tests
3. ✅ Build-to-Creature Converter — 41 tests
4. ✅ Scenario Simulation Harness — 22 tests
5. ✅ API & Frontend Integration — end-to-end validated

## Files Modified
- `server/utils/scenarioEngine.js` — Added roundLog:[], combatSummary to results
- `server/run-simulation.js` — Fixed options routing, updated trim logic, new CLI flags
- `src/pages/ScenariosPage.jsx` — Rewrote RoundLog component with combat summary view
- Deleted: `smoke-test-engine.js` (temporary test)
