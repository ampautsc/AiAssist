const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Species = require('../models/Species');
const Feat = require('../models/Feat');
const Item = require('../models/Item');
const Build = require('../models/Build');
const Spell = require('../models/Spell');
const ClassFeature = require('../models/ClassFeature');
const Skill = require('../models/Skill');
const Background = require('../models/Background');
const LevelProgression = require('../models/LevelProgression');
const Condition = require('../models/Condition');
const { computeBuildStats } = require('../utils/buildCalculator');

// Helper: populate a build query and enrich with computed stats
function populateBuild(query) {
  return query
    .populate('species')
    .populate('levelChoices.feat')
    .populate('items');
}

function enrichBuild(build) {
  const obj = build.toJSON ? build.toJSON() : { ...build };
  const computed = computeBuildStats(build);
  // Merge computed values — these override nothing since the model no longer stores them
  return {
    ...obj,
    stats: computed.stats,
    finalStats: computed.finalStats,
    finalCha: computed.finalCha,
    spellDc: computed.spellDc,
    finalAc: computed.finalAc,
    conSaveBonus: computed.conSaveBonus,
    conSaveType: computed.conSaveType,
    concentrationHoldPct: computed.concentrationHoldPct,
    featProgression: computed.featProgression,
    feats: computed.feats,
    overallScore: computed.overallScore,
  };
}

// --- SPECIES ---
router.get('/species', async (req, res) => {
  try {
    const { tier, source, creatureType, hasFlight } = req.query;
    const filter = {};
    if (tier) filter.tier = Number(tier);
    if (source) filter.source = source;
    if (creatureType) filter.creatureType = creatureType;
    if (hasFlight === 'true') filter.hasFlight = true;
    const species = await Species.find(filter).sort({ name: 1 });
    res.json(species);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/species/:id', async (req, res) => {
  try {
    const species = await Species.findById(req.params.id);
    if (!species) return res.status(404).json({ error: 'Species not found' });
    res.json(species);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- FEATS ---
router.get('/feats', async (req, res) => {
  try {
    const feats = await Feat.find().sort({ name: 1 });
    res.json(feats);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ITEMS ---
router.get('/items', async (req, res) => {
  try {
    const { rarity } = req.query;
    const filter = rarity ? { rarity } : {};
    const items = await Item.find(filter).sort({ name: 1 });
    res.json(items);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- BUILDS ---
router.get('/builds', async (req, res) => {
  try {
    const { species, archetype } = req.query;
    const filter = {};
    if (species) filter.species = species;
    if (archetype) filter.archetype = archetype;
    const builds = await populateBuild(Build.find(filter))
      .sort({ 'ratings.fun': -1 });
    res.json(builds.map(enrichBuild));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/builds/:id', async (req, res) => {
  try {
    const build = await populateBuild(Build.findById(req.params.id));
    if (!build) return res.status(404).json({ error: 'Build not found' });
    res.json(enrichBuild(build));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Create a new build
router.post('/builds', async (req, res) => {
  try {
    const build = await Build.create(req.body);
    res.status(201).json(build);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Update a build
router.put('/builds/:id', async (req, res) => {
  try {
    const build = await populateBuild(
      Build.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })
    );
    if (!build) return res.status(404).json({ error: 'Build not found' });
    res.json(enrichBuild(build));
  } catch (err) { res.status(400).json({ error: err.message }); }
});

// Delete a build
router.delete('/builds/:id', async (req, res) => {
  try {
    const build = await Build.findByIdAndDelete(req.params.id);
    if (!build) return res.status(404).json({ error: 'Build not found' });
    res.json({ message: 'Build deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SPELLS ---
router.get('/spells', async (req, res) => {
  try {
    const { level, school, concentration, bardNative, magicalSecretsCandidate, tag, minRating } = req.query;
    const filter = {};
    if (level !== undefined) filter.level = Number(level);
    if (school) filter.school = new RegExp(school, 'i');
    if (concentration !== undefined) filter.concentration = concentration === 'true';
    if (bardNative !== undefined) filter.bardNative = bardNative === 'true';
    if (magicalSecretsCandidate !== undefined) filter.magicalSecretsCandidate = magicalSecretsCandidate === 'true';
    if (tag) filter.tags = tag;
    if (minRating) filter.bardRating = { $gte: Number(minRating) };
    const spells = await Spell.find(filter).sort({ level: 1, bardRating: -1, name: 1 });
    res.json(spells);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/spells/:id', async (req, res) => {
  try {
    const spell = await Spell.findById(req.params.id);
    if (!spell) return res.status(404).json({ error: 'Spell not found' });
    res.json(spell);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CLASS FEATURES ---
router.get('/class-features', async (req, res) => {
  try {
    const { subclass, level } = req.query;
    const filter = { class: 'Bard' };
    if (subclass) filter.subclass = subclass;
    if (level) filter.level = { $lte: Number(level) };
    const features = await ClassFeature.find(filter).sort({ level: 1, name: 1 });
    res.json(features);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SKILLS ---
router.get('/skills', async (req, res) => {
  try {
    const { expertiseCandidate } = req.query;
    const filter = {};
    if (expertiseCandidate !== undefined) filter.expertiseCandidate = expertiseCandidate === 'true';
    const skills = await Skill.find(filter).sort({ name: 1 });
    res.json(skills);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- BACKGROUNDS ---
router.get('/backgrounds', async (req, res) => {
  try {
    const { minRating } = req.query;
    const filter = {};
    if (minRating) filter.bardRating = { $gte: Number(minRating) };
    const backgrounds = await Background.find(filter).sort({ bardRating: -1, name: 1 });
    res.json(backgrounds);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LEVEL PROGRESSION ---
router.get('/levels', async (req, res) => {
  try {
    const { maxLevel } = req.query;
    const filter = { class: 'Bard' };
    if (maxLevel) filter.level = { $lte: Number(maxLevel) };
    const levels = await LevelProgression.find(filter).sort({ level: 1 });
    res.json(levels);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/levels/:level', async (req, res) => {
  try {
    const level = await LevelProgression.findOne({ class: 'Bard', level: Number(req.params.level) });
    if (!level) return res.status(404).json({ error: 'Level not found' });
    res.json(level);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- CONDITIONS ---
router.get('/conditions', async (req, res) => {
  try {
    const { tag } = req.query;
    const filter = {};
    if (tag) filter.tags = tag;
    const conditions = await Condition.find(filter).sort({ name: 1 });
    res.json(conditions);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- SCENARIOS (Pre-computed Simulation Results — thin read from DB) ---
const ScenarioEvaluation = require('../models/ScenarioEvaluation');

router.get('/scenarios', async (req, res) => {
  try {
    // Serve the most recent completed evaluation from MongoDB
    const latest = await ScenarioEvaluation.findOne({ status: 'complete' })
      .sort({ computedAt: -1 })
      .lean();

    if (!latest) {
      return res.status(404).json({
        error: 'No simulation results found. Run: node server/run-simulation.js',
      });
    }

    // Return the pre-computed dashboard payload directly
    res.json(latest.results);
  } catch (err) {
    console.error('[API ERROR] /scenarios:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/scenarios/status — check if a simulation is running or when the last one completed
router.get('/scenarios/status', async (req, res) => {
  try {
    const latest = await ScenarioEvaluation.findOne()
      .sort({ computedAt: -1 })
      .select('status computedAt params error')
      .lean();

    if (!latest) return res.json({ status: 'none', message: 'No evaluations exist yet' });
    res.json(latest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/scenarios/simulate — trigger a new simulation as a child process
router.post('/scenarios/simulate', async (req, res) => {
  try {
    const { spawn } = require('child_process');
    const path = require('path');
    const sims = req.body?.simulations || 3;

    // Spawn the job as a detached child process so it doesn't block Express
    const child = spawn(
      process.execPath,
      [path.resolve(__dirname, '../run-simulation.js'), '--sims', String(sims)],
      {
        cwd: path.resolve(__dirname, '../..'),
        detached: true,
        stdio: 'ignore',
      }
    );
    child.unref();

    res.json({
      status: 'started',
      message: `Simulation started (${sims} sims/encounter). Check /api/scenarios/status for progress.`,
      pid: child.pid,
    });
  } catch (err) {
    console.error('[API ERROR] /scenarios/simulate:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// --- COMBAT LOGS (served from disk files) ---
const combatLogDir = path.join(__dirname, '../../combat-logs');

// GET /api/combat-logs — list all available log entries (build+scenario index)
router.get('/combat-logs', async (req, res) => {
  try {
    if (!require('fs').existsSync(combatLogDir)) {
      return res.json({ logs: [], message: 'No combat logs yet. Run a simulation first.' });
    }
    const files = require('fs').readdirSync(combatLogDir).filter(f => f.endsWith('.json'));
    const index = files.map(f => {
      const match = f.match(/^(.+)_(.+)\.json$/);
      if (!match) return null;
      return { buildId: match[1], scenarioId: match[2], file: f };
    }).filter(Boolean);
    res.json({ logs: index, total: index.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/combat-logs/:buildId — list available scenarios for a build
router.get('/combat-logs/:buildId', async (req, res) => {
  try {
    if (!require('fs').existsSync(combatLogDir)) {
      return res.json({ scenarios: [] });
    }
    const fs = require('fs');
    const files = fs.readdirSync(combatLogDir)
      .filter(f => f.startsWith(req.params.buildId + '_') && f.endsWith('.json'));
    const scenarios = files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(combatLogDir, f), 'utf-8'));
      return {
        scenarioId: data.scenarioId,
        scenarioName: data.scenarioName,
        winRate: data.winRate,
        avgRounds: data.avgRounds,
        numRuns: data.numRuns,
        sampleLogCount: data.sampleLogs?.length || 0,
      };
    });
    res.json({ buildId: req.params.buildId, scenarios });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/combat-logs/:buildId/:scenarioId — get full combat log data
router.get('/combat-logs/:buildId/:scenarioId', async (req, res) => {
  try {
    const fs = require('fs');
    const filePath = path.join(combatLogDir, `${req.params.buildId}_${req.params.scenarioId}.json`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No combat log found for this build+scenario' });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- COMBAT SIMULATOR TEST ---
router.get('/simulate-test', async (req, res) => {
  try {
    const { simulateEncounter } = require('../utils/combatSimulator');
    const { SCENARIOS, detectAbilities } = require('../utils/scenarioEngine');
    const { computeBuildStats } = require('../utils/buildCalculator');
    
    // Get first build for testing
    const build = await Build.findOne()
      .populate('species')
      .populate('levelChoices.feat')
      .populate('items')
      .lean({ virtuals: true });
    
    if (!build) return res.status(404).json({ error: 'No builds found' });
    
    const computed = computeBuildStats(build);
    const abilities = detectAbilities(build);
    const scenario = SCENARIOS[0]; // Test with first scenario
    
    const result = simulateEncounter(build, computed, abilities, scenario, { seed: 12345 });
    
    res.json({
      build: build.name,
      scenario: scenario.name,
      result: result.result,
      rounds: result.rounds,
      finalHP: result.finalHP,
      hpPct: result.hpPct,
      slotsUsed: result.slotsUsed,
      enemiesKilled: `${result.enemiesKilled}/${result.enemiesTotal}`,
      keyMoments: result.keyMoments,
      fullLog: result.log,
    });
  } catch (err) { 
    res.status(500).json({ error: err.message, stack: err.stack }); 
  }
});

module.exports = router;
