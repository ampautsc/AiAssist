/**
 * Temporary script to query MongoDB for simulation win/draw rates.
 * Run: node query-results.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const ScenarioEvaluation = require('./server/models/ScenarioEvaluation');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  // Get latest 3 complete evaluations
  const evals = await ScenarioEvaluation.find({ status: 'complete' })
    .sort({ computedAt: -1 })
    .limit(5)
    .lean();
  
  console.log(`Found ${evals.length} evaluations\n`);
  
  for (const ev of evals) {
    console.log('═══════════════════════════════════════════════════');
    console.log(`ID: ${ev._id}`);
    console.log(`Date: ${ev.computedAt}`);
    console.log(`Sims: ${ev.params.simulations} per build/scenario`);
    console.log(`Builds: ${ev.params.buildCount}, Scenarios: ${ev.params.scenarioCount}`);
    console.log(`Duration: ${(ev.params.durationMs / 1000).toFixed(1)}s`);
    
    const results = ev.results;
    if (!results || !results.scenarioResults) {
      console.log('  No scenario results found\n');
      continue;
    }
    
    // Aggregate win/draw/loss across all scenarios & builds
    let totalVictories = 0;
    let totalDefeats = 0;
    let totalStalemates = 0;
    let totalSims = 0;
    
    for (const scenario of results.scenarioResults) {
      if (!scenario.rankings) continue;
      for (const entry of scenario.rankings) {
        totalVictories += entry.victories || 0;
        totalDefeats += entry.defeats || 0;
        totalStalemates += entry.stalemates || 0;
        totalSims += entry.simulations || 0;
      }
    }
    
    if (totalSims > 0) {
      console.log(`\n  Aggregate across all build×scenario combos:`);
      console.log(`    Total sims:  ${totalSims}`);
      console.log(`    Victories:   ${totalVictories} (${(totalVictories/totalSims*100).toFixed(2)}%)`);
      console.log(`    Stalemates:  ${totalStalemates} (${(totalStalemates/totalSims*100).toFixed(2)}%)`);
      console.log(`    Defeats:     ${totalDefeats} (${(totalDefeats/totalSims*100).toFixed(2)}%)`);
    }
    
    // Top 5 builds
    if (results.buildSummaries?.length > 0) {
      console.log('\n  Top 5 Builds:');
      results.buildSummaries.slice(0, 5).forEach((b, i) => {
        console.log(`    ${i + 1}. ${b.name} — avg ${b.avgScore}`);
      });
    }
    
    // Sample a ranking entry to see what fields exist
    const sampleRanking = results.scenarioResults[0]?.rankings?.[0];
    if (sampleRanking) {
      const keys = Object.keys(sampleRanking);
      console.log(`\n  Ranking entry keys: ${keys.join(', ')}`);
      // Print full sample
      const { runs, combatSummary, notes, ...rest } = sampleRanking;
      console.log('  Sample ranking (without runs):', JSON.stringify(rest, null, 2).substring(0, 500));
    }
    
    console.log('');
  }
  
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
