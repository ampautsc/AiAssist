/**
 * Encounter definitions — unit tests
 *
 * Validates encounter data integrity: required fields, valid template keys,
 * valid AI profiles, difficulty ordering, and helper functions.
 *
 * Run: node --test src/combat/__tests__/encounters.test.js
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  ENCOUNTERS,
  DIFFICULTY_COLORS,
  CREATURE_DISPLAY,
  getEncountersByTheme,
  getEncounterById,
  getThemes,
  countFoes,
  foeSummary,
} from '../encounters.js'

// Known valid template keys (must match server/combat/data/creatures.js)
const VALID_TEMPLATE_KEYS = new Set([
  'gem_dragonborn_lore_bard_8', 'cult_fanatic', 'zombie', 'skeleton',
  'ghoul', 'ghast', 'werewolf', 'young_red_dragon', 'hill_giant',
  'frost_giant', 'ogre', 'bandit', 'bandit_captain', 'mage', 'archmage', 'lich',
])

// Known valid AI profile keys (must match server/combat/ai/tactics.js PROFILES)
const VALID_AI_PROFILES = new Set([
  'lore_bard', 'cult_fanatic', 'generic_melee', 'generic_ranged',
  'dragon', 'giant_bruiser', 'mage_caster', 'archmage_caster',
  'lich_caster', 'undead_melee',
])

const VALID_DIFFICULTIES = new Set(['easy', 'medium', 'hard', 'deadly'])

// ═══════════════════════════════════════════════════════════════════════════
// Encounter data integrity
// ═══════════════════════════════════════════════════════════════════════════

describe('Encounter data integrity', () => {
  it('ENCOUNTERS is a non-empty array', () => {
    assert.ok(Array.isArray(ENCOUNTERS))
    assert.ok(ENCOUNTERS.length > 0, 'Expected at least one encounter')
  })

  it('all encounters have unique IDs', () => {
    const ids = ENCOUNTERS.map(e => e.id)
    const unique = new Set(ids)
    assert.equal(ids.length, unique.size, `Duplicate IDs found: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`)
  })

  for (const enc of ENCOUNTERS) {
    describe(`Encounter: ${enc.id}`, () => {
      it('has required string fields', () => {
        assert.ok(typeof enc.id === 'string' && enc.id.length > 0)
        assert.ok(typeof enc.name === 'string' && enc.name.length > 0)
        assert.ok(typeof enc.description === 'string' && enc.description.length > 0)
        assert.ok(typeof enc.theme === 'string' && enc.theme.length > 0)
      })

      it('has valid difficulty', () => {
        assert.ok(VALID_DIFFICULTIES.has(enc.difficulty),
          `Invalid difficulty "${enc.difficulty}" — expected one of: ${[...VALID_DIFFICULTIES].join(', ')}`)
      })

      it('has numeric totalCR >= 0', () => {
        assert.ok(typeof enc.totalCR === 'number')
        assert.ok(enc.totalCR >= 0)
      })

      it('has non-empty foes array', () => {
        assert.ok(Array.isArray(enc.foes))
        assert.ok(enc.foes.length > 0, 'Encounter must have at least one foe group')
      })

      for (const foe of enc.foes) {
        describe(`Foe group: ${foe.templateKey} x${foe.count}`, () => {
          it('has valid templateKey', () => {
            assert.ok(VALID_TEMPLATE_KEYS.has(foe.templateKey),
              `Unknown templateKey "${foe.templateKey}"`)
          })

          it('has valid aiProfile', () => {
            assert.ok(VALID_AI_PROFILES.has(foe.aiProfile),
              `Unknown aiProfile "${foe.aiProfile}" — expected one of: ${[...VALID_AI_PROFILES].join(', ')}`)
          })

          it('has positive count', () => {
            assert.ok(typeof foe.count === 'number')
            assert.ok(foe.count >= 1)
          })

          it('positions (if defined) have valid {q,r} entries matching count or fewer', () => {
            if (!foe.positions) return // optional
            assert.ok(Array.isArray(foe.positions))
            assert.ok(foe.positions.length <= foe.count,
              `More positions (${foe.positions.length}) than foe count (${foe.count})`)
            for (const pos of foe.positions) {
              assert.ok(typeof pos.q === 'number')
              assert.ok(typeof pos.r === 'number')
            }
          })
        })
      }
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// CREATURE_DISPLAY
// ═══════════════════════════════════════════════════════════════════════════

describe('CREATURE_DISPLAY', () => {
  it('has entries for all templateKeys used in encounters', () => {
    const usedKeys = new Set()
    for (const enc of ENCOUNTERS) {
      for (const foe of enc.foes) usedKeys.add(foe.templateKey)
    }
    for (const key of usedKeys) {
      assert.ok(CREATURE_DISPLAY[key], `Missing CREATURE_DISPLAY entry for "${key}"`)
    }
  })

  for (const [key, data] of Object.entries(CREATURE_DISPLAY)) {
    it(`${key} has valid display data`, () => {
      assert.ok(typeof data.name === 'string' && data.name.length > 0)
      assert.ok(typeof data.hp === 'number' && data.hp > 0)
      assert.ok(typeof data.maxHp === 'number' && data.maxHp > 0)
      assert.equal(data.hp, data.maxHp, 'Initial hp should equal maxHp')
      assert.ok(typeof data.ac === 'number' && data.ac > 0)
      assert.ok(typeof data.speed === 'number' && data.speed > 0)
    })
  }
})

// ═══════════════════════════════════════════════════════════════════════════
// DIFFICULTY_COLORS
// ═══════════════════════════════════════════════════════════════════════════

describe('DIFFICULTY_COLORS', () => {
  it('has a color for every valid difficulty level', () => {
    for (const diff of VALID_DIFFICULTIES) {
      assert.ok(DIFFICULTY_COLORS[diff], `Missing color for difficulty "${diff}"`)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Query helpers
// ═══════════════════════════════════════════════════════════════════════════

describe('getEncountersByTheme', () => {
  it('returns only undead encounters for theme "undead"', () => {
    const results = getEncountersByTheme('undead')
    assert.ok(results.length > 0)
    for (const enc of results) {
      assert.equal(enc.theme, 'undead')
    }
  })

  it('returns empty array for non-existent theme', () => {
    const results = getEncountersByTheme('dragons-that-do-not-exist-yet')
    assert.deepEqual(results, [])
  })
})

describe('getEncounterById', () => {
  it('returns the correct encounter for a known ID', () => {
    const enc = getEncounterById('undead-patrol')
    assert.ok(enc)
    assert.equal(enc.id, 'undead-patrol')
    assert.equal(enc.name, 'Shambling Patrol')
  })

  it('returns undefined for unknown ID', () => {
    assert.equal(getEncounterById('nonexistent'), undefined)
  })
})

describe('getThemes', () => {
  it('returns an array of unique theme strings', () => {
    const themes = getThemes()
    assert.ok(Array.isArray(themes))
    assert.ok(themes.length > 0)
    assert.equal(themes.length, new Set(themes).size, 'Themes should be unique')
    assert.ok(themes.includes('undead'))
  })
})

describe('countFoes', () => {
  it('counts total enemies correctly', () => {
    const horde = getEncounterById('undead-horde')
    assert.ok(horde)
    // 4 zombies + 4 skeletons + 2 ghouls = 10
    assert.equal(countFoes(horde), 10)
  })

  it('returns correct count for single-group encounter', () => {
    const patrol = getEncounterById('undead-patrol')
    assert.ok(patrol)
    assert.equal(countFoes(patrol), 2)
  })
})

describe('foeSummary', () => {
  it('generates readable summary with pluralization', () => {
    const mixed = getEncounterById('undead-mixed')
    assert.ok(mixed)
    const summary = foeSummary(mixed)
    assert.ok(summary.includes('3 Zombies'))
    assert.ok(summary.includes('2 Skeletons'))
  })

  it('uses singular for count of 1', () => {
    const elite = getEncounterById('undead-elite')
    assert.ok(elite)
    const summary = foeSummary(elite)
    assert.ok(summary.includes('1 Ghast'), `Expected "1 Ghast" in "${summary}"`)
  })
})
