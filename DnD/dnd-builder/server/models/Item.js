const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  rarity: { type: String, default: 'uncommon' },
  requiresAttunement: { type: Boolean, default: false },
  slot: String, // "hands", "cloak", "neck", "instrument", "ring", "head", "feet"
  acBonus: { type: Number, default: 0 },
  saveBonus: { type: Number, default: 0 },
  spellDcBonus: { type: Number, default: 0 },       // +X to spell save DC
  spellAttackBonus: { type: Number, default: 0 },    // +X to spell attack rolls
  requiresNoArmor: { type: Boolean, default: false }, // Bracers of Defense
  requiresNoShield: { type: Boolean, default: false },
  imposesCharmDisadvantage: { type: Boolean, default: false }, // Instruments of the Bards
  grantedSpells: [String], // Spells the item can cast 1/day
  description: String,
  mechanicalSummary: String,
  tags: [String] // ["defense", "social", "utility", "concentration", "mobility"]
});

module.exports = mongoose.model('Item', itemSchema);
