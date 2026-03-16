/**
 * Smoke test script — run with: node scripts/test-npc-responses.js
 */
'use strict'

const { buildFromPersonality } = require('../server/services/CharacterContextBuilder')
const { generateResponse } = require('../server/services/CharacterResponseService')
const { MockLLMProvider } = require('../server/llm/MockLLMProvider')
const { setProvider } = require('../server/llm/LLMProvider')
const fs   = require('fs')
const path = require('path')

setProvider(new MockLLMProvider())

const EVENTS = ['combat_start', 'attacked', 'near_death', 'player_addressed', 'enemy_died', 'round_start']

;(async () => {
  const seedDir = path.join(__dirname, '../server/data/npcPersonalities')
  const files   = fs.readdirSync(seedDir).filter(f => f.endsWith('.json'))

  for (const file of files) {
    const personality = JSON.parse(fs.readFileSync(path.join(seedDir, file), 'utf8'))
    console.log(`\n=== ${personality.name} (${personality.race}, ${personality.npcType}) ===`)

    for (const evt of EVENTS) {
      try {
        const pkg    = buildFromPersonality({ personality, triggerEvent: evt, worldLocation: 'ancient dungeon', worldTone: 'dire' })
        const result = await generateResponse(pkg, { personality })
        console.log(`  [${evt}] "${result.text}"`)
      } catch (e) {
        console.log(`  [${evt}] ERROR: ${e.message}`)
      }
    }
  }

  console.log('\n=== Templates available ===')
  console.log(files.map(f => path.basename(f, '.json')).join(', '))
  console.log('\nAll done.')
})()
