const mongoose = require('mongoose');

const featSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  isHalfFeat: { type: Boolean, default: false },
  halfFeatStat: String, // "CHA", "DEX", "CON", etc.
  prerequisite: String, // "Dragonborn", null, etc.
  grantsArmorProficiency: String, // "medium+shield", null
  grantsAdvConSaves: { type: Boolean, default: false },
  grantsProfConSaves: { type: Boolean, default: false },
  description: String,
  mechanicalSummary: String, // short one-liner for tables
  bonusSpells: [String], // ["Misty Step", "Silvery Barbs"]
  tags: [String] // ["defense", "concentration", "mobility", "social", "offense"]
});

module.exports = mongoose.model('Feat', featSchema);
