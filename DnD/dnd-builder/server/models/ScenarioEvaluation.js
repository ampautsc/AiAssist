const mongoose = require('mongoose');

/**
 * ScenarioEvaluation — pre-computed combat simulation results.
 * 
 * Stores the full output of the simulation service so that the API layer
 * never performs heavy computation at request time.
 * 
 * One document per evaluation run. The API serves the most recent one.
 * Old runs are kept for comparison / audit.
 */
const scenarioEvaluationSchema = new mongoose.Schema({
  // When this evaluation was computed
  computedAt: { type: Date, default: Date.now, index: true },

  // Simulation parameters used
  params: {
    simulations: { type: Number, required: true },   // sims per build/scenario
    maxRounds:   { type: Number, required: true },    // max rounds per encounter
    buildCount:  { type: Number, required: true },    // how many builds evaluated
    scenarioCount: { type: Number, required: true },  // how many scenarios
    totalEncounters: { type: Number, required: true }, // builds × scenarios × sims
    durationMs:  { type: Number },                     // wall-clock time to compute
  },

  // The full dashboard payload — exactly what the UI expects
  // Shape: { scenarioResults, buildSummaries, ironComparison, partyAnalysis, scenarios }
  results: { type: mongoose.Schema.Types.Mixed, required: true },

  // Status: 'running' while job executes, 'complete' when done, 'failed' on error
  status: { type: String, enum: ['running', 'complete', 'failed'], default: 'running' },
  error:  { type: String },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ScenarioEvaluation', scenarioEvaluationSchema);
