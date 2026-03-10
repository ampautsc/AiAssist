/**
 * Spell Registry — unit tests
 * Validates spell data integrity and registry API.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const spells = require('../data/spells');

// ═══════════════════════════════════════════════════════════════════════════
// Registry API
// ═══════════════════════════════════════════════════════════════════════════

describe('getSpell', () => {
  it('returns spell data for known spell', () => {
    const hp = spells.getSpell('Hypnotic Pattern');
    assert.equal(hp.name, 'Hypnotic Pattern');
    assert.equal(hp.level, 3);
    assert.equal(hp.concentration, true);
  });

  it('throws for unknown spell', () => {
    assert.throws(() => spells.getSpell('Meteor Swarm'), /Unknown spell/);
  });
});

describe('hasSpell', () => {
  it('returns true for registered spell', () => {
    assert.equal(spells.hasSpell('Hold Person'), true);
  });

  it('returns false for unregistered spell', () => {
    assert.equal(spells.hasSpell('Meteor Swarm'), false);
  });
});

describe('getSpellsByLevel', () => {
  it('returns cantrips (level 0)', () => {
    const cantrips = spells.getSpellsByLevel(0);
    assert.ok(cantrips.length >= 2); // Vicious Mockery, Sacred Flame
    assert.ok(cantrips.every(s => s.level === 0));
  });

  it('returns level 3 spells', () => {
    const lvl3 = spells.getSpellsByLevel(3);
    const names = lvl3.map(s => s.name);
    assert.ok(names.includes('Hypnotic Pattern'));
    assert.ok(names.includes('Counterspell'));
  });
});

describe('getSpellsByTag', () => {
  it('returns spells with "control" tag', () => {
    const control = spells.getSpellsByTag('control');
    const names = control.map(s => s.name);
    assert.ok(names.includes('Hypnotic Pattern'));
    assert.ok(names.includes('Hold Person'));
    assert.ok(names.includes('Command'));
  });
});

describe('getConcentrationSpells', () => {
  it('returns only concentration spells', () => {
    const conc = spells.getConcentrationSpells();
    assert.ok(conc.every(s => s.concentration === true));
    const names = conc.map(s => s.name);
    assert.ok(names.includes('Hypnotic Pattern'));
    assert.ok(names.includes('Hold Person'));
    assert.ok(names.includes('Greater Invisibility'));
    assert.ok(names.includes('Shield of Faith'));
  });
});

describe('isConcentrationSpell', () => {
  it('true for Hold Person', () => {
    assert.equal(spells.isConcentrationSpell('Hold Person'), true);
  });

  it('false for Inflict Wounds', () => {
    assert.equal(spells.isConcentrationSpell('Inflict Wounds'), false);
  });
});

describe('getAllSpellNames', () => {
  it('returns all registered spell names', () => {
    const names = spells.getAllSpellNames();
    assert.ok(names.length >= 12);
    assert.ok(names.includes('Vicious Mockery'));
    assert.ok(names.includes('Greater Invisibility'));
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Spell Data Integrity — every spell must have required fields
// ═══════════════════════════════════════════════════════════════════════════

describe('spell data integrity', () => {
  const allSpells = Object.values(spells.SPELLS);

  for (const spell of allSpells) {
    describe(`${spell.name}`, () => {
      it('has required string fields', () => {
        assert.equal(typeof spell.name, 'string');
        assert.equal(typeof spell.school, 'string');
        assert.equal(typeof spell.castingTime, 'string');
        assert.equal(typeof spell.notes, 'string');
      });

      it('has required number fields', () => {
        assert.equal(typeof spell.level, 'number');
        assert.ok(spell.level >= 0 && spell.level <= 9);
        assert.equal(typeof spell.range, 'number');
        assert.equal(typeof spell.duration, 'number');
      });

      it('has boolean concentration flag', () => {
        assert.equal(typeof spell.concentration, 'boolean');
      });

      it('has valid targeting', () => {
        assert.ok(spell.targeting);
        assert.ok(['single', 'self', 'area'].includes(spell.targeting.type));
      });

      it('has tags array', () => {
        assert.ok(Array.isArray(spell.tags));
        assert.ok(spell.tags.length > 0);
      });

      it('has effects arrays', () => {
        assert.ok(Array.isArray(spell.effects));
        assert.ok(Array.isArray(spell.selfEffects));
        assert.ok(Array.isArray(spell.onConcentrationEnd));
      });

      it('save or attack or both are null, not undefined', () => {
        assert.ok(spell.save === null || typeof spell.save === 'object');
        assert.ok(spell.attack === null || typeof spell.attack === 'object');
      });

      it('if concentration, has onConcentrationEnd defined', () => {
        if (spell.concentration) {
          assert.ok(Array.isArray(spell.onConcentrationEnd));
        }
      });

      it('damage dice format is valid if present', () => {
        if (spell.damage && spell.damage.dice) {
          assert.ok(/^\d+d\d+$/.test(spell.damage.dice), `Invalid dice format: ${spell.damage.dice}`);
        }
      });
    });
  }
});
