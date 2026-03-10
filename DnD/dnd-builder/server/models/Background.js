const mongoose = require('mongoose');

const backgroundSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  source: { type: String, default: 'PHB' },
  skillProficiencies: [String],              // ["Deception", "Stealth"]
  toolProficiencies: [String],               // ["Thieves' tools", "Disguise kit"]
  languages: { type: Number, default: 0 },   // number of language choices
  equipment: [String],                        // starting equipment items
  feature: {
    name: String,
    description: String,
  },
  description: String,
  bardSynergy: String,                        // why this works well for a Lore Bard
  bardRating: { type: Number, min: 1, max: 10 },
});

module.exports = mongoose.model('Background', backgroundSchema);
