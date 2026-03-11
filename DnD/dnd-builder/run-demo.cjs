/**
 * Combat Demo — runs a sample encounter using the new intent-based AoE system.
 * AI declares WHERE to place spells, engine determines WHO gets hit.
 */

'use strict'

const dice = require('./server/combat/engine/dice')
const { createCreature } = require('./server/combat/data/creatures')
const { runEncounter } = require('./server/combat/engine/encounterRunner')
const { makeTacticalAI, makeReactionAI } = require('./server/combat/ai/tactics')

// Use average mode for reproducible results
dice.setDiceMode('average')

// ── Create combatants ────────────────────────────────────────────────────
const bard = createCreature('gem_dragonborn_lore_bard_8', {
  position: { x: 0, y: 0 },
})

const enemies = []
for (let i = 0; i < 10; i++) {
  enemies.push(createCreature('cult_fanatic', {
    id: `cult_fanatic_${i + 1}`,
    name: `Cult Fanatic ${i + 1}`,
    position: { x: 8 + i, y: Math.floor(i / 3) },
  }))
}

const combatants = [bard, ...enemies]

// ── AI setup ─────────────────────────────────────────────────────────────
const profileMap = {
  gem_dragonborn_lore_bard_8: 'lore_bard',
  cult_fanatic: 'cult_fanatic',
}

const tacticalAI = makeTacticalAI(profileMap)
const reactionAI = makeReactionAI(profileMap)

// ── Run encounter ────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════════════')
console.log('  COMBAT DEMO — Gem Dragonborn Lore Bard vs 10 Cult Fanatics')
console.log('  AoE targeting: Engine-resolved (aoeCenter-based)')
console.log('═══════════════════════════════════════════════════════════════')
console.log()

// Show positions
console.log('Positions:')
console.log(`  Bard: (${bard.position.x}, ${bard.position.y})`)
enemies.forEach(e => console.log(`  ${e.name}: (${e.position.x}, ${e.position.y})`))
console.log()

const result = runEncounter({
  combatants,
  getDecision: tacticalAI,
  getReaction: reactionAI,
  maxRounds: 15,
  verbose: true,
})

// ── Print results ────────────────────────────────────────────────────────
console.log()
console.log('═══════════════════════════════════════════════════════════════')
console.log(`  RESULT: ${result.winner} wins in ${result.rounds} rounds`)
console.log('═══════════════════════════════════════════════════════════════')
console.log()

// Show analytics
if (result.analytics) {
  console.log('Analytics:')
  for (const a of result.analytics) {
    const status = a.survived ? 'ALIVE' : 'DEAD'
    console.log(`  ${a.name}: ${status} (${a.finalHP}/${a.maxHP} HP) — dealt ${a.damageDealt} dmg, took ${a.damageTaken} dmg, ${a.spellsCast} spells`)
  }
}
