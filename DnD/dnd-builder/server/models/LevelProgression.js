const mongoose = require('mongoose');

const levelProgressionSchema = new mongoose.Schema({
  class: { type: String, required: true },       // "Bard"
  level: { type: Number, required: true },
  proficiencyBonus: { type: Number, required: true },
  features: [String],                             // feature names gained at this level

  // Spellcasting
  cantripsKnown: Number,
  spellsKnown: Number,
  spellSlots: {
    1: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    5: { type: Number, default: 0 },
    6: { type: Number, default: 0 },
    7: { type: Number, default: 0 },
    8: { type: Number, default: 0 },
    9: { type: Number, default: 0 },
  },

  // Class-specific
  bardicInspirationDie: Number,   // 6, 8, 10, 12
  songOfRestDie: Number,          // 0, 6, 8, 10, 12
  magicalSecretsSlots: Number,    // 0, 2, 4, 6

  // Derived for quick reference
  maxSpellLevel: Number,          // highest spell level you can cast at this level
  totalSpellSlots: Number,        // sum of all slots
});

levelProgressionSchema.index({ class: 1, level: 1 }, { unique: true });

module.exports = mongoose.model('LevelProgression', levelProgressionSchema);
