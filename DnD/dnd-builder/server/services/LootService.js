/**
 * LootService — Generates loot drops from loot tables.
 *
 * Pure service layer: no side effects, no external dependencies.
 * Takes a loot table + a dice roller and produces concrete loot arrays.
 *
 * Design:
 *   - Deterministic when used with a seeded/fixed dice roller
 *   - Does NOT mutate any external state
 *   - Returns plain data objects suitable for storage in GameState or session
 */

'use strict'

const dice = require('../combat/engine/dice')
const { getLootTable } = require('../combat/data/lootTables')

/**
 * Roll a quantity expression — either a fixed number or a dice string.
 * @param {number|string} expr - e.g. 3, '1d4', '2d6'
 * @returns {number}
 */
function rollQuantity(expr) {
  if (typeof expr === 'number') return Math.max(0, Math.floor(expr))
  if (typeof expr === 'string') {
    const parsed = dice.parseDiceAndRoll(expr)
    return parsed.total
  }
  return 1
}

/**
 * Generate loot from a loot table.
 *
 * @param {Array} lootTable - Array of loot entry objects from lootTables.js
 * @param {function} [randomFn] - Optional random function (0-1), defaults to Math.random
 * @returns {{ items: Array<{ itemId: string, quantity: number }>, currency: Object<string, number> }}
 */
function generateLoot(lootTable, randomFn = Math.random) {
  const items = []
  const currency = {}

  if (!Array.isArray(lootTable) || lootTable.length === 0) {
    return { items, currency }
  }

  for (const entry of lootTable) {
    const roll = randomFn()
    if (roll > entry.chance) continue // did not drop

    if (entry.type === 'item') {
      const qty = rollQuantity(entry.quantity ?? 1)
      if (qty > 0) {
        items.push({ itemId: entry.itemId, quantity: qty })
      }
    } else if (entry.type === 'currency') {
      const amount = rollQuantity(entry.amount ?? 0)
      if (amount > 0) {
        const key = entry.currency || 'gold'
        currency[key] = (currency[key] || 0) + amount
      }
    }
  }

  return { items, currency }
}

/**
 * Generate loot for a creature by template key.
 *
 * @param {string} templateKey - Creature template key (e.g. 'zombie', 'bandit')
 * @param {function} [randomFn] - Optional random function for deterministic testing
 * @returns {{ items: Array<{ itemId: string, quantity: number }>, currency: Object<string, number> }}
 */
function generateLootForCreature(templateKey, randomFn) {
  const table = getLootTable(templateKey)
  return generateLoot(table, randomFn)
}

/**
 * Check if generated loot is empty (no items and no currency).
 * @param {{ items: Array, currency: Object }} loot
 * @returns {boolean}
 */
function isLootEmpty(loot) {
  if (!loot) return true
  if (loot.items && loot.items.length > 0) return false
  if (loot.currency && Object.keys(loot.currency).length > 0) return false
  return true
}

module.exports = {
  generateLoot,
  generateLootForCreature,
  rollQuantity,
  isLootEmpty,
}
