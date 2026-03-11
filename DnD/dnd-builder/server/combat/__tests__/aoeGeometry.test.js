'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const geo = require('../engine/aoeGeometry')

// ═══════════════════════════════════════════════════════════════════════════
// getEffectiveRadius
// ═══════════════════════════════════════════════════════════════════════════

describe('getEffectiveRadius', () => {
  it('returns half the side length for a cube', () => {
    assert.equal(geo.getEffectiveRadius({ shape: 'cube', size: 30 }), 15)
  })

  it('returns the radius for a sphere', () => {
    assert.equal(geo.getEffectiveRadius({ shape: 'sphere', radius: 20 }), 20)
  })

  it('returns the length for a cone', () => {
    assert.equal(geo.getEffectiveRadius({ shape: 'cone', length: 60 }), 60)
  })

  it('returns the radius for a cylinder', () => {
    assert.equal(geo.getEffectiveRadius({ shape: 'cylinder', radius: 20, height: 40 }), 20)
  })

  it('returns 0 for a wall', () => {
    assert.equal(geo.getEffectiveRadius({ shape: 'wall' }), 0)
  })

  it('returns 0 for unknown shape', () => {
    assert.equal(geo.getEffectiveRadius({ shape: 'hexagon' }), 0)
  })

  it('returns 0 for null/undefined', () => {
    assert.equal(geo.getEffectiveRadius(null), 0)
    assert.equal(geo.getEffectiveRadius(undefined), 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// isInAoE — point within AoE centered at a given location
// ═══════════════════════════════════════════════════════════════════════════

describe('isInAoE — cube', () => {
  const targeting = { shape: 'cube', size: 30 } // 15ft effective radius

  it('includes point at the center', () => {
    assert.equal(geo.isInAoE({ x: 5, y: 5 }, { x: 5, y: 5 }, targeting), true)
  })

  it('includes point within range (Chebyshev)', () => {
    // 3 squares × 5ft = 15ft = exactly the radius
    assert.equal(geo.isInAoE({ x: 8, y: 5 }, { x: 5, y: 5 }, targeting), true)
  })

  it('excludes point outside range', () => {
    // 4 squares × 5ft = 20ft > 15ft
    assert.equal(geo.isInAoE({ x: 9, y: 5 }, { x: 5, y: 5 }, targeting), false)
  })

  it('includes diagonal at max range', () => {
    // Chebyshev: max(3, 3) = 3 squares × 5ft = 15ft
    assert.equal(geo.isInAoE({ x: 8, y: 8 }, { x: 5, y: 5 }, targeting), true)
  })

  it('excludes diagonal past max range', () => {
    // Chebyshev: max(4, 4) = 4 squares × 5ft = 20ft > 15ft
    assert.equal(geo.isInAoE({ x: 9, y: 9 }, { x: 5, y: 5 }, targeting), false)
  })
})

describe('isInAoE — sphere', () => {
  const targeting = { shape: 'sphere', radius: 20 } // 20ft radius

  it('includes point at center', () => {
    assert.equal(geo.isInAoE({ x: 5, y: 5 }, { x: 5, y: 5 }, targeting), true)
  })

  it('includes point at max radius (4 squares × 5ft = 20ft)', () => {
    assert.equal(geo.isInAoE({ x: 9, y: 5 }, { x: 5, y: 5 }, targeting), true)
  })

  it('excludes point beyond radius', () => {
    assert.equal(geo.isInAoE({ x: 10, y: 5 }, { x: 5, y: 5 }, targeting), false)
  })
})

describe('isInAoE — cone', () => {
  const targeting = { shape: 'cone', length: 60 } // 60ft

  it('includes point within length (Chebyshev)', () => {
    // 12 squares × 5ft = 60ft = exactly the length
    assert.equal(geo.isInAoE({ x: 12, y: 0 }, { x: 0, y: 0 }, targeting), true)
  })

  it('excludes point beyond length', () => {
    assert.equal(geo.isInAoE({ x: 13, y: 0 }, { x: 0, y: 0 }, targeting), false)
  })
})

describe('isInAoE — cylinder', () => {
  const targeting = { shape: 'cylinder', radius: 20, height: 40 }

  it('includes point at the radius boundary', () => {
    assert.equal(geo.isInAoE({ x: 4, y: 0 }, { x: 0, y: 0 }, targeting), true)
  })

  it('excludes point beyond radius', () => {
    assert.equal(geo.isInAoE({ x: 5, y: 0 }, { x: 0, y: 0 }, targeting), false)
  })
})

describe('isInAoE — wall', () => {
  it('always returns false (wall requires special handling)', () => {
    assert.equal(geo.isInAoE({ x: 0, y: 0 }, { x: 0, y: 0 }, { shape: 'wall' }), false)
  })
})

describe('isInAoE — edge cases', () => {
  it('returns false for null targeting', () => {
    assert.equal(geo.isInAoE({ x: 0, y: 0 }, { x: 0, y: 0 }, null), false)
  })

  it('handles missing position fields gracefully', () => {
    const targeting = { shape: 'sphere', radius: 20 }
    assert.equal(geo.isInAoE({}, {}, targeting), true) // both default to (0,0) → same point
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// computeOptimalCenter — find best placement for AoE
// ═══════════════════════════════════════════════════════════════════════════

describe('computeOptimalCenter', () => {
  it('returns centroid when within casting range', () => {
    const caster = { position: { x: 0, y: 0 } }
    const enemies = [
      { position: { x: 8, y: 0 } },
      { position: { x: 10, y: 0 } },
    ]
    const result = geo.computeOptimalCenter(caster, enemies, 120, 20)
    // Centroid x = 9, y = 0. Within 120ft range (9*5=45ft)
    assert.equal(result.x, 9)
    assert.equal(result.y, 0)
  })

  it('falls back to closest enemy position when centroid out of range', () => {
    const caster = { position: { x: 0, y: 0 } }
    const enemies = [
      { position: { x: 20, y: 0 } },  // 100ft
      { position: { x: 30, y: 0 } },  // 150ft — far
    ]
    // Centroid is (25, 0), distance = 125ft. If castRange = 60ft, centroid out of range
    // Closest enemy is (20, 0)
    const result = geo.computeOptimalCenter(caster, enemies, 60, 20)
    assert.equal(result.x, 20)
    assert.equal(result.y, 0)
  })

  it('returns caster position for self-origin spells (range 0)', () => {
    const caster = { position: { x: 5, y: 3 } }
    const enemies = [
      { position: { x: 6, y: 3 } },
      { position: { x: 7, y: 4 } },
    ]
    const result = geo.computeOptimalCenter(caster, enemies, 0, 60)
    assert.equal(result.x, 5)
    assert.equal(result.y, 3)
  })

  it('handles enemies with no position — defaults to (0, 0)', () => {
    const caster = { position: { x: 0, y: 0 } }
    const enemies = [{}]
    const result = geo.computeOptimalCenter(caster, enemies, 120, 20)
    assert.equal(result.x, 0)
    assert.equal(result.y, 0)
  })

  it('returns null when no enemies provided', () => {
    const caster = { position: { x: 0, y: 0 } }
    const result = geo.computeOptimalCenter(caster, [], 120, 20)
    assert.equal(result, null)
  })
})
