const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  ability: { type: String, required: true },   // "CHA", "DEX", "WIS", etc.
  description: String,
  bardProficient: { type: Boolean, default: false },   // Bards can pick any skill
  expertiseCandidate: { type: Boolean, default: false }, // good expertise target for Lore Bard
  expertiseNotes: String,
});

module.exports = mongoose.model('Skill', skillSchema);
