const mongoose = require('mongoose');

// Structured innate spellcasting entry
const innateSpellSchema = {
  spell: String,            // "Faerie Fire", "Hellish Rebuke"
  levelRequired: Number,    // Character level needed (1 = always/cantrip, 3, 5, etc.)
  frequency: String,        // "at will", "1/long rest", "PB/long rest"
  spellcastingAbility: String, // "CHA", "INT", "WIS", "INT/WIS/CHA"
  notes: String             // "as a 2nd-level spell", etc.
};

// Variant/subrace within a species page
const variantSchema = {
  name: String,             // "Chromatic", "Asmodeus Bloodline", "Mountain"
  source: String,           // "FTD", "PHB", "MTF"
  sourceFull: String,       // "Fizban's Treasury of Dragons"
  creatureType: String,
  size: [String],
  speed: {
    walk: Number,
    fly: Number,
    swim: Number,
    climb: Number
  },
  darkvision: Number,
  asiDescription: String,
  asiFixed: [{ stat: String, bonus: Number }],
  resistances: [String],
  damageImmunities: [String],
  conditionImmunities: [String],
  innateSpells: [innateSpellSchema],
  traits: [{ name: String, description: String }],
  armorProficiencies: [String],
  weaponProficiencies: [String],
  toolProficiencies: [String],
  skillProficiencies: [String],
  languages: [String],
  rawText: String
};

const speciesSchema = new mongoose.Schema({
  // Identity
  name: { type: String, required: true, unique: true },
  slug: String,              // wikidot URL slug: "fairy", "dragonborn"
  source: String,            // Primary source abbreviation: "MPMM", "PHB", "FTD"
  sourceFull: String,        // Full source name
  description: String,       // Flavor text / lore paragraph

  // Core traits (primary version — MPMM when available)
  creatureType: { type: String, default: 'Humanoid' },
  size: { type: [String], default: ['Medium'] },
  speed: {
    walk: { type: Number, default: 30 },
    fly: Number,
    swim: Number,
    climb: Number
  },
  darkvision: { type: Number, default: 0 },
  languages: { type: [String], default: ['Common'] },

  // Ability Score Increase
  asiDescription: String,    // "CHA +2, INT +1" or "Choose any +2/+1"
  asiFixed: [{ stat: String, bonus: Number }],
  asiFlexible: { type: Boolean, default: false },

  // Resistances & Immunities
  resistances: [String],           // ["fire", "poison", "necrotic"]
  damageImmunities: [String],
  conditionImmunities: [String],   // ["poisoned", "charmed"]

  // Innate Spellcasting (structured for filtering)
  innateSpells: [innateSpellSchema],

  // Flight details
  hasFlight: { type: Boolean, default: false },
  flightRestriction: String,  // "no medium or heavy armor", null

  // Natural armor/weapons
  naturalArmorAC: Number,
  naturalWeapons: [{
    name: String,
    damage: String,           // "1d6 + STR slashing"
    description: String
  }],

  // Proficiencies
  armorProficiencies: [String],
  weaponProficiencies: [String],
  toolProficiencies: [String],
  skillProficiencies: [String],
  skillChoices: {
    count: Number,
    from: [String]
  },

  // All traits (name + description pairs)
  traitList: [{
    name: String,
    description: String
  }],

  // Variants/subraces
  variants: [variantSchema],

  // Full raw text for reference
  rawText: String,

  // === Legacy fields for Lore Bard build compatibility ===
  tier: Number,                // 1, 2, or 3
  nonSpellAbilities: [{
    name: String,
    description: String,
    actionCost: String,
    usesPerDay: String,
    dcStat: String,
    isConcentration: { type: Boolean, default: false },
    isSpell: { type: Boolean, default: false },
    notes: String
  }],
  socialKit: {
    rating: { type: Number, min: 1, max: 10 },
    highlights: [String]
  },
  combatNotes: String,
  flavorText: String
}, { timestamps: true });

// Virtual: backward-compat "traits" object that old UI reads
speciesSchema.virtual('traits').get(function() {
  const magicRes = this.traitList?.some(t =>
    t.name?.toLowerCase().includes('magic resistance')
  ) || false;
  return {
    magicResistance: magicRes,
    feyType: this.creatureType === 'Fey',
    naturalArmor: this.naturalArmorAC || null,
    armorProficiency: this.armorProficiencies?.length > 0 ? this.armorProficiencies.join(', ') : 'none',
    permanentFlight: this.hasFlight || false,
    innateTelepathy: this.traitList?.some(t =>
      t.name?.toLowerCase().includes('telepathy') || t.name?.toLowerCase().includes('telepathic')
    ) || false,
    speed: this.speed?.walk || 30,
    poisonImmunity: this.damageImmunities?.includes('poison') ||
      this.conditionImmunities?.includes('poisoned') || false,
    darkvision: this.darkvision || 0
  };
});

speciesSchema.set('toJSON', { virtuals: true });
speciesSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Species', speciesSchema);
