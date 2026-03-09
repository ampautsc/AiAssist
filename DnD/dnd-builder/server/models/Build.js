const mongoose = require('mongoose');

const buildSchema = new mongoose.Schema({
  name: { type: String, required: true },
  species: { type: mongoose.Schema.Types.ObjectId, ref: 'Species', required: true },
  level: { type: Number, default: 8 },

  // Base ability scores BEFORE any racial or feat bonuses
  baseStats: {
    str: { type: Number, default: 8 },
    dex: { type: Number, default: 14 },
    con: { type: Number, default: 14 },
    int: { type: Number, default: 8 },
    wis: { type: Number, default: 12 },
    cha: { type: Number, default: 16 }
  },

  // Player's chosen ASI from species (Tasha's flexible or species default)
  speciesAsi: [{ stat: String, bonus: Number }],

  // Choices at each ASI/feat level (4, 8 for most; 1 for Custom Lineage free feat)
  levelChoices: [{
    level: Number,
    type: { type: String, enum: ['feat', 'asi'] },
    feat: { type: mongoose.Schema.Types.ObjectId, ref: 'Feat' },
    halfFeatStat: String, // which stat gets +1 for half-feats
    asiIncreases: [{ stat: String, bonus: Number }]
  }],

  // Equipped items
  items: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],

  // Background (optional, for future expansion)
  background: { type: mongoose.Schema.Types.ObjectId, ref: 'Background' },

  // Build identity (authored content)
  archetype: String,
  philosophy: String,
  combatLoop: String,
  risks: String,
  rewards: String,

  // Subjective ratings (authored, not computed)
  ratings: {
    combat: { type: Number, min: 1, max: 10 },
    social: { type: Number, min: 1, max: 10 },
    fun: { type: Number, min: 1, max: 10 },
    durability: { type: Number, min: 1, max: 10 }
  }
}, { timestamps: true });

buildSchema.set('toJSON', { virtuals: true });
buildSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Build', buildSchema);
