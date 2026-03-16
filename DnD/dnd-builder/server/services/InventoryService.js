/**
 * InventoryService — Per-session player inventory management.
 *
 * Pure service layer: operates on plain data objects (the inventory),
 * does not touch databases or external systems.
 *
 * An inventory is a plain object:
 *   {
 *     items: Array<{ itemId: string, quantity: number }>,
 *     currency: { gold: number, silver: number, copper: number, ... }
 *   }
 *
 * Design:
 *   - All methods are pure functions returning new inventory objects
 *   - No mutation of input parameters
 *   - Designed for in-memory session storage in CombatSessionManager
 *   - Easy to unit test with deterministic inputs
 */

'use strict'

/**
 * Create a new empty inventory.
 * @returns {{ items: Array, currency: Object }}
 */
function createInventory() {
  return {
    items: [],
    currency: {},
  }
}

/**
 * Add an item to the inventory. Stacks with existing items of the same ID.
 *
 * @param {{ items: Array, currency: Object }} inventory
 * @param {string} itemId
 * @param {number} [quantity=1]
 * @returns {{ items: Array, currency: Object }} New inventory
 */
function addItem(inventory, itemId, quantity = 1) {
  if (!itemId || quantity <= 0) return { ...inventory, items: [...inventory.items] }

  const newItems = [...inventory.items]
  const existing = newItems.findIndex(i => i.itemId === itemId)

  if (existing >= 0) {
    newItems[existing] = {
      ...newItems[existing],
      quantity: newItems[existing].quantity + quantity,
    }
  } else {
    newItems.push({ itemId, quantity })
  }

  return { ...inventory, items: newItems, currency: { ...inventory.currency } }
}

/**
 * Remove an item from the inventory.
 * If quantity reaches 0, the item entry is removed entirely.
 *
 * @param {{ items: Array, currency: Object }} inventory
 * @param {string} itemId
 * @param {number} [quantity=1]
 * @returns {{ items: Array, currency: Object, removed: boolean }} New inventory + success flag
 */
function removeItem(inventory, itemId, quantity = 1) {
  const idx = inventory.items.findIndex(i => i.itemId === itemId)
  if (idx < 0) {
    return { ...inventory, items: [...inventory.items], currency: { ...inventory.currency }, removed: false }
  }

  const current = inventory.items[idx]
  if (current.quantity < quantity) {
    return { ...inventory, items: [...inventory.items], currency: { ...inventory.currency }, removed: false }
  }

  const newItems = [...inventory.items]
  const remaining = current.quantity - quantity
  if (remaining <= 0) {
    newItems.splice(idx, 1)
  } else {
    newItems[idx] = { ...current, quantity: remaining }
  }

  return { ...inventory, items: newItems, currency: { ...inventory.currency }, removed: true }
}

/**
 * Add currency to the inventory.
 *
 * @param {{ items: Array, currency: Object }} inventory
 * @param {string} type - e.g. 'gold', 'silver', 'copper'
 * @param {number} amount
 * @returns {{ items: Array, currency: Object }}
 */
function addCurrency(inventory, type, amount) {
  if (!type || amount <= 0) return { ...inventory, items: [...inventory.items], currency: { ...inventory.currency } }

  return {
    ...inventory,
    items: [...inventory.items],
    currency: {
      ...inventory.currency,
      [type]: (inventory.currency[type] || 0) + amount,
    },
  }
}

/**
 * Remove currency from the inventory.
 *
 * @param {{ items: Array, currency: Object }} inventory
 * @param {string} type
 * @param {number} amount
 * @returns {{ inventory: { items: Array, currency: Object }, removed: boolean }}
 */
function removeCurrency(inventory, type, amount) {
  const current = inventory.currency[type] || 0
  if (current < amount) {
    return {
      inventory: { ...inventory, items: [...inventory.items], currency: { ...inventory.currency } },
      removed: false,
    }
  }

  const remaining = current - amount
  const newCurrency = { ...inventory.currency }
  if (remaining <= 0) {
    delete newCurrency[type]
  } else {
    newCurrency[type] = remaining
  }

  return {
    inventory: { ...inventory, items: [...inventory.items], currency: newCurrency },
    removed: true,
  }
}

/**
 * Merge loot (from LootService) into an inventory.
 *
 * @param {{ items: Array, currency: Object }} inventory
 * @param {{ items: Array<{ itemId: string, quantity: number }>, currency: Object }} loot
 * @returns {{ items: Array, currency: Object }}
 */
function mergeLoot(inventory, loot) {
  let result = { ...inventory, items: [...inventory.items], currency: { ...inventory.currency } }

  // Add items
  if (loot.items) {
    for (const item of loot.items) {
      result = addItem(result, item.itemId, item.quantity)
    }
  }

  // Add currency
  if (loot.currency) {
    for (const [type, amount] of Object.entries(loot.currency)) {
      result = addCurrency(result, type, amount)
    }
  }

  return result
}

/**
 * Get the total quantity of a specific item in the inventory.
 *
 * @param {{ items: Array, currency: Object }} inventory
 * @param {string} itemId
 * @returns {number}
 */
function getItemCount(inventory, itemId) {
  const entry = inventory.items.find(i => i.itemId === itemId)
  return entry ? entry.quantity : 0
}

/**
 * Get the amount of a specific currency type.
 *
 * @param {{ items: Array, currency: Object }} inventory
 * @param {string} type
 * @returns {number}
 */
function getCurrencyAmount(inventory, type) {
  return inventory.currency[type] || 0
}

/**
 * Check if the inventory is empty.
 *
 * @param {{ items: Array, currency: Object }} inventory
 * @returns {boolean}
 */
function isEmpty(inventory) {
  if (inventory.items.length > 0) return false
  for (const amount of Object.values(inventory.currency)) {
    if (amount > 0) return false
  }
  return true
}

module.exports = {
  createInventory,
  addItem,
  removeItem,
  addCurrency,
  removeCurrency,
  mergeLoot,
  getItemCount,
  getCurrencyAmount,
  isEmpty,
}
