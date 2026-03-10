const mongoose = require('mongoose');

const conditionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: [String],
  mechanicalSummary: String,   // one-liner
  removedBy: [String],         // spells/effects that remove it
  tags: [String],              // ["incapacitated", "restrained", "mental"]
});

module.exports = mongoose.model('Condition', conditionSchema);
