/**
 * hexUtils — scatterPositions unit tests
 *
 * Run: node --test src/combat/__tests__/hexUtils.test.js
 */

import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { hexDistance, scatterPositions } from '../hexUtils.js'

// ═══════════════════════════════════════════════════════════════════════════
// scatterPositions
// ═══════════════════════════════════════════════════════════════════════════

describe('scatterPositions', () => {
  it('returns the requested number of positions', () => {
    const positions = scatterPositions(5)
    assert.equal(positions.length, 5)
  })

  it('returns positions within [minDist, maxDist] from center', () => {
    const center = { q: 0, r: 0 }
    const positions = scatterPositions(10, center, 4, 8, 64)
    for (const pos of positions) {
      const dist = hexDistance(center, pos)
      assert.ok(dist >= 4, `Position (${pos.q},${pos.r}) is too close: distance ${dist}`)
      assert.ok(dist <= 8, `Position (${pos.q},${pos.r}) is too far: distance ${dist}`)
    }
  })

  it('returns non-overlapping positions', () => {
    const positions = scatterPositions(20, { q: 0, r: 0 }, 3, 10, 64)
    const keys = new Set()
    for (const pos of positions) {
      const key = `${pos.q},${pos.r}`
      assert.ok(!keys.has(key), `Duplicate position: ${key}`)
      keys.add(key)
    }
  })

  it('respects the occupied set', () => {
    const occupied = new Set(['5,0', '6,0', '7,0', '5,-1', '6,-1'])
    const positions = scatterPositions(10, { q: 0, r: 0 }, 4, 8, 64, 1, occupied)
    for (const pos of positions) {
      const key = `${pos.q},${pos.r}`
      assert.ok(!occupied.has(key), `Placed on occupied hex: ${key}`)
    }
  })

  it('respects correct center offset', () => {
    const center = { q: 10, r: -5 }
    const positions = scatterPositions(5, center, 3, 6, 64)
    for (const pos of positions) {
      const dist = hexDistance(center, pos)
      assert.ok(dist >= 3 && dist <= 6,
        `Position (${pos.q},${pos.r}) is out of range from center (${center.q},${center.r}): distance ${dist}`)
    }
  })

  it('clips to mapRadius', () => {
    const mapRadius = 10
    const positions = scatterPositions(5, { q: 0, r: 0 }, 6, 10, mapRadius)
    for (const pos of positions) {
      const absDist = Math.max(Math.abs(pos.q), Math.abs(pos.r), Math.abs(-pos.q - pos.r))
      assert.ok(absDist <= mapRadius,
        `Position (${pos.q},${pos.r}) exceeds map radius ${mapRadius}`)
    }
  })

  it('handles requesting more positions than available gracefully', () => {
    // Very small ring with mapRadius=3: not many positions available
    const positions = scatterPositions(100, { q: 0, r: 0 }, 2, 3, 3)
    // Should return as many as it can find, not crash
    assert.ok(positions.length > 0)
    assert.ok(positions.length <= 100)
  })

  it('returns empty array when count is 0', () => {
    const positions = scatterPositions(0)
    assert.equal(positions.length, 0)
  })

  it('positions have {q, r} number properties', () => {
    const positions = scatterPositions(3)
    for (const pos of positions) {
      assert.ok(typeof pos.q === 'number')
      assert.ok(typeof pos.r === 'number')
    }
  })
})
