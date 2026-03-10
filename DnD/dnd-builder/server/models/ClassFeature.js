const mongoose = require('mongoose');

const classFeatureSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class: { type: String, required: true },           // "Bard"
  subclass: String,                                   // "College of Lore", null for base class
  level: { type: Number, required: true },
  source: { type: String, default: 'PHB' },

  description: [String],                              // paragraphs
  mechanicalSummary: String,                          // one-liner

  // Scaling info
  scalesAtLevel: [Number],                            // [1, 5, 10, 15] for Bardic Inspiration die
  scalingDescription: String,                         // "d6→d8→d10→d12"

  // Tags
  actionCost: String,                                 // "Bonus Action", "Reaction", "Passive", "Action"
  usesPerDay: String,                                 // "CHA mod/long rest", "unlimited", "PB/long rest"
  tags: [String],                                     // ["offense", "support", "social", "defense"]
});

classFeatureSchema.index({ class: 1, level: 1 });

module.exports = mongoose.model('ClassFeature', classFeatureSchema);
