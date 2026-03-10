/**
 * run-simulation.js — Standalone job to pre-compute combat simulation results.
 *
 * Architecture: Simulation is a DATA INGESTION concern, not a runtime concern.
 * This job runs separately from Express, computes all results, and stores them
 * in MongoDB. The API simply reads the stored results — zero computation at
 * request time.
 *
 * Usage:
 *   node server/run-simulation.js                   # new combat engine (default)
 *   node server/run-simulation.js --sims 10         # 10 sims/encounter
 *   node server/run-simulation.js --legacy          # math-based only (fast, no simulation)
 *   node server/run-simulation.js --old-sim         # old Monte Carlo simulator
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const Build = require('./models/Build');
const ScenarioEvaluation = require('./models/ScenarioEvaluation');
// Require all referenced models so Mongoose can resolve populate() refs
require('./models/Species');
require('./models/Feat');
require('./models/Item');
const { runFullEvaluation, SCENARIOS } = require('./utils/scenarioEngine');

// ── Parse CLI args ──
const args = process.argv.slice(2);
const simIndex = args.indexOf('--sims');
const simulations = simIndex !== -1 ? parseInt(args[simIndex + 1], 10) : 100;
const useLegacy = args.includes('--legacy');

async function runSimulation() {
  const startTime = Date.now();
  console.log('═══════════════════════════════════════════════════');
  console.log('  Combat Simulation Job');
  console.log('═══════════════════════════════════════════════════');
  console.log(`  Mode:        ${useLegacy ? 'LEGACY (math-based)' : 'COMBAT ENGINE (turn-by-turn)'}`);
  console.log(`  Simulations: ${useLegacy ? 'N/A' : simulations + ' per build/scenario'}`);
  console.log(`  Started:     ${new Date().toLocaleString()}`);
  console.log('');

  // ── Connect to MongoDB ──
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('[DB] Connected to MongoDB');

  // ── Load all builds (fully populated) ──
  const builds = await Build.find()
    .populate('species')
    .populate('levelChoices.feat')
    .populate('items')
    .lean({ virtuals: true });
  console.log(`[DB] Loaded ${builds.length} builds`);

  if (builds.length === 0) {
    console.error('[ERROR] No builds found in database. Run seed.js first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const totalEncounters = builds.length * SCENARIOS.length * (useLegacy ? 1 : simulations);
  console.log(`[SIM] ${builds.length} builds × ${SCENARIOS.length} scenarios × ${useLegacy ? '1 (math)' : simulations + ' sims'} = ${totalEncounters} encounters`);
  console.log('');

  // ── Create a placeholder document so the API knows a run is in progress ──
  const evalDoc = await ScenarioEvaluation.create({
    status: 'running',
    params: {
      simulations: useLegacy ? 0 : simulations,
      maxRounds: 20,
      buildCount: builds.length,
      scenarioCount: SCENARIOS.length,
      totalEncounters,
    },
    results: {},
  });
  console.log(`[DB] Created evaluation record: ${evalDoc._id}`);

  try {
    // ── Run the evaluation ──
    // Default: new combat engine.  --legacy: math-based only. --old-sim: previous Monte Carlo.
    const useOldSim = args.includes('--old-sim');
    const options = {
      useCombatEngine: !useLegacy && !useOldSim,  // New turn-by-turn engine (default)
      useSimulation: useOldSim,                     // Old Monte Carlo (explicit opt-in)
      simulations,
    };
    const results = runFullEvaluation(builds, options);

    const durationMs = Date.now() - startTime;

    // ── Trim heavy fields to stay under MongoDB 16MB BSON limit ──
    // With 450+ builds × 8 scenarios = 3600+ ranking entries, keep summary data
    // but drop verbose per-round logs.
    if (results.scenarioResults) {
      for (const scenario of results.scenarioResults) {
        if (scenario.rankings) {
          for (const entry of scenario.rankings) {
            delete entry.simulationDetails;
            // Keep roundLog only if non-empty (old format); combat engine already sends []
            if (!entry.roundLog || entry.roundLog.length === 0) {
              delete entry.roundLog;
            }
            // Keep combatSummary (compact per-combatant analytics)
            // Keep notes but trim to first 3 items max
            if (entry.notes && entry.notes.length > 3) {
              entry.notes = entry.notes.slice(0, 3);
            }
          }
        }
      }
    }

    // ── Store results ──
    evalDoc.results = results;
    evalDoc.status = 'complete';
    evalDoc.params.durationMs = durationMs;
    evalDoc.computedAt = new Date();
    await evalDoc.save();

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  ✅ Simulation Complete');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Duration:    ${(durationMs / 1000).toFixed(1)}s`);
    console.log(`  Builds:      ${results.buildSummaries?.length || 0}`);
    console.log(`  Scenarios:   ${results.scenarioResults?.length || 0}`);
    console.log(`  Iron Comps:  ${results.ironComparison?.length || 0}`);
    console.log(`  Party Recs:  ${results.partyAnalysis?.length || 0}`);
    console.log(`  Record ID:   ${evalDoc._id}`);
    console.log('');

    // ── Print top 5 builds ──
    if (results.buildSummaries?.length > 0) {
      console.log('  Top 5 Builds by Average Score:');
      results.buildSummaries.slice(0, 5).forEach((b, i) => {
        console.log(`    ${i + 1}. ${b.name} — ${b.avgScore} avg (best: ${b.best.scenario} ${b.best.score}, worst: ${b.worst.scenario} ${b.worst.score})`);
      });
      console.log('');
    }

  } catch (err) {
    console.error('[ERROR] Simulation failed:', err);
    evalDoc.status = 'failed';
    evalDoc.error = err.message;
    evalDoc.params.durationMs = Date.now() - startTime;
    await evalDoc.save();
    process.exitCode = 1;
  }

  await mongoose.disconnect();
  console.log('[DB] Disconnected');
}

runSimulation().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
