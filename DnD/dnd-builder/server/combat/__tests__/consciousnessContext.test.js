/**
 * Consciousness Context Schema Validation Tests
 *
 * Validates that all NPC personality JSON files contain a well-formed
 * consciousnessContext block with all required fields.
 *
 * Run with:
 *   node --test server/combat/__tests__/consciousnessContext.test.js
 */

'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const path = require('path')

const PERSONALITIES_DIR = path.join(__dirname, '../../data/npcPersonalities')

// Required top-level fields in consciousnessContext
const REQUIRED_FIELDS = [
  'innerMonologue',
  'currentPreoccupation',
  'emotionalBaseline',
  'socialMask',
  'contradictions',
  'internalConflicts',
  'wakeUpQuestions',
  'psychologicalProfile',
  'conversationPersona',
]

// Required fields in psychologicalProfile
const REQUIRED_PSYCH_FIELDS = [
  'attachmentStyle',
  'copingMechanisms',
  'cognitiveBiases',
  'moralFramework',
]

// Required fields in conversationPersona
const REQUIRED_PERSONA_FIELDS = [
  'defaultTrust',
  'trustEscalation',
  'informationRelease',
  'deflectionPatterns',
]

// Load all personality files
function loadAllPersonalities() {
  const files = fs.readdirSync(PERSONALITIES_DIR).filter(f => f.endsWith('.json'))
  return files.map(f => {
    const filePath = path.join(PERSONALITIES_DIR, f)
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return { fileName: f, data }
  })
}

describe('consciousnessContext schema validation', () => {
  const personalities = loadAllPersonalities()

  it('should find at least 30 personality files', () => {
    assert.ok(personalities.length >= 30, `Expected >= 30 files, got ${personalities.length}`)
  })

  it('every personality file should have a consciousnessContext field', () => {
    const missing = personalities.filter(p => !p.data.consciousnessContext)
    assert.equal(
      missing.length,
      0,
      `Files missing consciousnessContext: ${missing.map(m => m.fileName).join(', ')}`
    )
  })

  for (const { fileName, data } of loadAllPersonalities()) {
    describe(`${fileName}`, () => {
      const cc = data.consciousnessContext

      if (!cc) {
        it('has consciousnessContext (MISSING)', () => {
          assert.fail(`${fileName} is missing consciousnessContext entirely`)
        })
        return
      }

      it('has all required top-level fields', () => {
        for (const field of REQUIRED_FIELDS) {
          assert.ok(
            cc[field] !== undefined,
            `Missing required field: consciousnessContext.${field}`
          )
        }
      })

      it('innerMonologue is a non-empty string', () => {
        assert.equal(typeof cc.innerMonologue, 'string')
        assert.ok(cc.innerMonologue.length > 10, 'innerMonologue should be substantive')
      })

      it('currentPreoccupation is a non-empty string', () => {
        assert.equal(typeof cc.currentPreoccupation, 'string')
        assert.ok(cc.currentPreoccupation.length > 10, 'currentPreoccupation should be substantive')
      })

      it('emotionalBaseline is a non-empty string', () => {
        assert.equal(typeof cc.emotionalBaseline, 'string')
        assert.ok(cc.emotionalBaseline.length > 0)
      })

      it('socialMask is a non-empty string', () => {
        assert.equal(typeof cc.socialMask, 'string')
        assert.ok(cc.socialMask.length > 0)
      })

      it('contradictions is an array with at least one entry', () => {
        assert.ok(Array.isArray(cc.contradictions), 'contradictions must be an array')
        assert.ok(cc.contradictions.length >= 1, 'contradictions must have at least one entry')
        for (const c of cc.contradictions) {
          assert.equal(typeof c, 'string', 'each contradiction must be a string')
        }
      })

      it('wakeUpQuestions is an array with at least one entry', () => {
        assert.ok(Array.isArray(cc.wakeUpQuestions), 'wakeUpQuestions must be an array')
        assert.ok(cc.wakeUpQuestions.length >= 1, 'wakeUpQuestions must have at least one entry')
        for (const q of cc.wakeUpQuestions) {
          assert.equal(typeof q, 'string', 'each wakeUpQuestion must be a string')
        }
      })

      it('psychologicalProfile has all required fields', () => {
        assert.ok(cc.psychologicalProfile, 'psychologicalProfile must exist')
        for (const field of REQUIRED_PSYCH_FIELDS) {
          assert.ok(
            cc.psychologicalProfile[field] !== undefined,
            `Missing: psychologicalProfile.${field}`
          )
        }
      })

      it('psychologicalProfile.copingMechanisms is an array', () => {
        assert.ok(
          Array.isArray(cc.psychologicalProfile.copingMechanisms),
          'copingMechanisms must be an array'
        )
      })

      it('psychologicalProfile.cognitiveBiases is an array', () => {
        assert.ok(
          Array.isArray(cc.psychologicalProfile.cognitiveBiases),
          'cognitiveBiases must be an array'
        )
      })

      it('conversationPersona has all required fields', () => {
        assert.ok(cc.conversationPersona, 'conversationPersona must exist')
        for (const field of REQUIRED_PERSONA_FIELDS) {
          assert.ok(
            cc.conversationPersona[field] !== undefined,
            `Missing: conversationPersona.${field}`
          )
        }
      })

      it('defaultTrust is a number between 0 and 1', () => {
        const trust = cc.conversationPersona.defaultTrust
        assert.equal(typeof trust, 'number', 'defaultTrust must be a number')
        assert.ok(trust >= 0 && trust <= 1, `defaultTrust must be 0-1, got ${trust}`)
      })

      it('deflectionPatterns is an array', () => {
        assert.ok(
          Array.isArray(cc.conversationPersona.deflectionPatterns),
          'deflectionPatterns must be an array'
        )
      })
    })
  }
})
