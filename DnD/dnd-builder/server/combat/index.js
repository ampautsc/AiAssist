/**
 * Combat System — barrel exports
 * 
 * Single entry point for the modular combat engine.
 * 
 * Usage:
 *   const combat = require('./combat');
 *   combat.dice.setDiceMode('average');
 *   const bard = combat.creatures.createCreature('gem_dragonborn_lore_bard_8');
 *   const result = combat.encounter.runEncounter({ ... });
 */

const dice = require('./engine/dice');
const mechanics = require('./engine/mechanics');
const spellResolver = require('./engine/spellResolver');
const encounterRunner = require('./engine/encounterRunner');
const spells = require('./data/spells');
const creatures = require('./data/creatures');
const buildConverter = require('./data/buildConverter');
const tactics = require('./ai/tactics');
const scenarioHarness = require('./scenarioHarness');

module.exports = {
  dice,
  mechanics,
  spellResolver,
  encounter: encounterRunner,
  spells,
  creatures,
  buildConverter,
  tactics,
  scenarioHarness,
};
