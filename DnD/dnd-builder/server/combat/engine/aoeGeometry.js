/**
 * AoE Geometry Module — pure geometry calculations for area-of-effect spells
 *
 * This module contains NO business logic and NO side effects.
 * It computes spatial relationships on a 5ft-per-square grid
 * using Chebyshev distance (consistent with D&D 5e grid movement).
 *
 * Used by targetResolver.js to determine which combatants fall
 * within an area of effect, and by the AI layer to compute
 * optimal AoE placement.
 */

'use strict'

/**
 * Get the effective radius (in feet) of a spell's AoE targeting geometry.
 * - cube:     half the side length
 * - sphere:   the radius
 * - cone:     the length (cone's max extent from origin)
 * - cylinder: the radius
 * - wall:     0 (requires special handling elsewhere)
 *
 * @param {object|null} targeting - the structured targeting object from spell data
 * @returns {number} effective radius in feet
 */
function getEffectiveRadius(targeting) {
  if (!targeting) return 0
  switch (targeting.shape) {
    case 'cube':     return Math.floor((targeting.size || 0) / 2)
    case 'sphere':   return targeting.radius || 0
    case 'cone':     return targeting.length || 0
    case 'cylinder': return targeting.radius || 0
    case 'wall':     return 0
    default:         return 0
  }
}

/**
 * Check whether a grid position is inside an AoE centered at a given point.
 * Uses Chebyshev distance on the grid (max of |dx|, |dy|) × 5ft.
 *
 * @param {{ x?: number, y?: number }} position - the position to test
 * @param {{ x?: number, y?: number }} center   - the AoE center point
 * @param {object|null} targeting - structured targeting geometry
 * @returns {boolean} true if position is within the AoE
 */
function isInAoE(position, center, targeting) {
  if (!targeting || !targeting.shape) return false

  // Wall requires special handling — not a simple radius check
  if (targeting.shape === 'wall') return false

  const radius = getEffectiveRadius(targeting)
  const px = position?.x || 0
  const py = position?.y || 0
  const cx = center?.x || 0
  const cy = center?.y || 0

  const distFeet = Math.max(Math.abs(px - cx), Math.abs(py - cy)) * 5
  return distFeet <= radius
}

/**
 * Compute the optimal center point for an AoE spell placement.
 * The AI uses this to decide WHERE to place the AoE — the engine
 * then uses isInAoE() to decide WHO is affected.
 *
 * Strategy:
 * 1. For self-origin spells (castRange === 0), returns caster position.
 * 2. Otherwise, computes the centroid of reachable enemies.
 * 3. If the centroid is within casting range, use it.
 * 4. If not, fall back to the closest enemy's position.
 *
 * @param {object} caster     - creature with .position
 * @param {object[]} enemies  - array of creatures with .position
 * @param {number} castRange  - how far the caster can place the AoE (feet)
 * @param {number} aoeRadius  - effective radius/half-side of the AoE (feet)
 * @returns {{ x: number, y: number }|null} optimal center, or null if no enemies
 */
function computeOptimalCenter(caster, enemies, castRange, aoeRadius) {
  if (!enemies || enemies.length === 0) return null

  const casterX = caster?.position?.x || 0
  const casterY = caster?.position?.y || 0

  // Self-origin spells: AoE is always centered on the caster
  if (castRange === 0) {
    return { x: casterX, y: casterY }
  }

  // Filter to enemies potentially reachable (within cast range + AoE radius)
  const reachable = enemies.filter(e => {
    const ex = e.position?.x || 0
    const ey = e.position?.y || 0
    const dist = Math.max(Math.abs(ex - casterX), Math.abs(ey - casterY)) * 5
    return dist <= castRange + aoeRadius
  })

  if (reachable.length === 0) {
    // No reachable enemies — use closest enemy position as best effort
    const closest = enemies.reduce((best, e) => {
      const ex = e.position?.x || 0
      const ey = e.position?.y || 0
      const dist = Math.max(Math.abs(ex - casterX), Math.abs(ey - casterY)) * 5
      const bestDist = Math.max(Math.abs((best.position?.x || 0) - casterX), Math.abs((best.position?.y || 0) - casterY)) * 5
      return dist < bestDist ? e : best
    })
    return { x: closest.position?.x || 0, y: closest.position?.y || 0 }
  }

  // Compute centroid of reachable enemies
  const avgX = reachable.reduce((sum, e) => sum + (e.position?.x || 0), 0) / reachable.length
  const avgY = reachable.reduce((sum, e) => sum + (e.position?.y || 0), 0) / reachable.length

  // Round to nearest grid position
  const centroidX = Math.round(avgX)
  const centroidY = Math.round(avgY)

  // Check if centroid is within casting range
  const distToCentroid = Math.max(Math.abs(centroidX - casterX), Math.abs(centroidY - casterY)) * 5
  if (distToCentroid <= castRange) {
    return { x: centroidX, y: centroidY }
  }

  // Centroid out of range — use closest enemy position
  const closest = reachable.reduce((best, e) => {
    const ex = e.position?.x || 0
    const ey = e.position?.y || 0
    const dist = Math.max(Math.abs(ex - casterX), Math.abs(ey - casterY)) * 5
    const bestDist = Math.max(Math.abs((best.position?.x || 0) - casterX), Math.abs((best.position?.y || 0) - casterY)) * 5
    return dist < bestDist ? e : best
  })
  return { x: closest.position?.x || 0, y: closest.position?.y || 0 }
}

module.exports = {
  getEffectiveRadius,
  isInAoE,
  computeOptimalCenter,
}
