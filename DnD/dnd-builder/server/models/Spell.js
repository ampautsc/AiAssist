const mongoose = require('mongoose');

const spellSchema = new mongoose.Schema({
  // Identity
  index: { type: String, required: true, unique: true },      // "hypnotic-pattern"
  name: { type: String, required: true },                      // "Hypnotic Pattern"
  source: { type: String, default: 'PHB' },                    // "PHB", "XGE", "TCE"

  // Core properties
  level: { type: Number, required: true },                     // 0=cantrip, 1-9
  school: { type: String, required: true },                    // "Illusion", "Abjuration", etc.
  ritual: { type: Boolean, default: false },
  concentration: { type: Boolean, default: false },

  // Casting
  castingTime: { type: String, required: true },               // "1 action", "1 bonus action", "1 reaction"
  range: String,                                               // "120 feet", "Self", "Touch"
  components: [String],                                        // ["V", "S", "M"]
  material: String,                                            // material component description
  duration: String,                                            // "Up to 1 minute", "Instantaneous"

  // Description
  description: [String],                                       // full text paragraphs
  higherLevel: [String],                                       // upcasting text

  // Mechanical tags for filtering/analysis
  savingThrow: String,                                         // "WIS", "DEX", "CON", etc.
  damageType: String,                                          // "psychic", "radiant", etc.
  healingSpell: { type: Boolean, default: false },
  areaOfEffect: {
    type: { type: String },                                    // "cube", "cone", "sphere", "line", "cylinder"
    size: Number                                               // in feet
  },

  // Class lists
  classes: [String],                                           // ["Bard", "Wizard", "Sorcerer"]
  subclasses: [String],                                        // ["Lore", "Land"]

  // Bard-specific analysis
  bardNative: { type: Boolean, default: false },               // true if on Bard spell list
  magicalSecretsCandidate: { type: Boolean, default: false },  // true if NOT bard but worth stealing
  magicalSecretsNotes: String,                                 // why you'd pick this via Magical Secrets

  // Lore Bard analysis tags
  tags: [String],  // ["control", "damage", "healing", "buff", "debuff", "utility", "social", "exploration"]
  bardRating: { type: Number, min: 1, max: 10 },              // how good is this for a Lore Bard specifically
  bardNotes: String,                                           // tactical notes for Bard use
});

spellSchema.index({ level: 1, bardNative: 1 });
spellSchema.index({ school: 1 });
spellSchema.index({ tags: 1 });

module.exports = mongoose.model('Spell', spellSchema);
