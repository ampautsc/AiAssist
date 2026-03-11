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
// isInAoE — flying creatures (3D altitude)
// ═══════════════════════════════════════════════════════════════════════════

describe('isInAoE — flying creatures (cube)', () => {
  it('flying creature outside 30ft cube (15ft radius < 30ft altitude)', () => {
    const targeting = { shape: 'cube', size: 30 } // 15ft effective radius
    // 3D Chebyshev: max(0, 30) = 30 > 15 → outside
    assert.equal(geo.isInAoE({ x: 5, y: 5 }, { x: 5, y: 5 }, targeting, { flying: true }), false)
  })

  it('flying creature inside 60ft cube (30ft radius = 30ft altitude)', () => {
    const targeting = { shape: 'cube', size: 60 } // 30ft effective radius
    // 3D Chebyshev: max(0, 30) = 30 ≤ 30 → inside
    assert.equal(geo.isInAoE({ x: 5, y: 5 }, { x: 5, y: 5 }, targeting, { flying: true }), true)
  })

  it('flying creature outside 60ft cube when also horizontally far', () => {
    const targeting = { shape: 'cube', size: 60 } // 30ft radius
    // horizontal = 7 squares * 5 = 35ft. 3D Chebyshev: max(35, 30) = 35 > 30
    assert.equal(geo.isInAoE({ x: 12, y: 5 }, { x: 5, y: 5 }, targeting, { flying: true }), false)
  })

  it('grounded creature still works with flying: false', () => {
    const targeting = { shape: 'cube', size: 30 }
    assert.equal(geo.isInAoE({ x: 8, y: 5 }, { x: 5, y: 5 }, targeting, { flying: false }), true)
  })
})

describe('isInAoE — flying creatures (sphere)', () => {
  it('Fireball (20ft sphere) cannot reach flying creature at 30ft altitude', () => {
    const targeting = { shape: 'sphere', radius: 20 }
    // 3D Euclidean: sqrt(0² + 30²) = 30 > 20
    assert.equal(geo.isInAoE({ x: 5, y: 5 }, { x: 5, y: 5 }, targeting, { flying: true }), false)
  })

  it('40ft sphere can reach flying creature directly above', () => {
    const targeting = { shape: 'sphere', radius: 40 }
    // sqrt(0² + 30²) = 30 ≤ 40
    assert.equal(geo.isInAoE({ x: 5, y: 5 }, { x: 5, y: 5 }, targeting, { flying: true }), true)
  })

  it('Fireball cannot reach flying creature even 1 square away horizontally', () => {
    const targeting = { shape: 'sphere', radius: 20 }
    // sqrt(5² + 30²) = sqrt(925) ≈ 30.4 > 20
    assert.equal(geo.isInAoE({ x: 6, y: 5 }, { x: 5, y: 5 }, targeting, { flying: true }), false)
  })
})

describe('isInAoE — flying creatures (cone)', () => {
  it('15ft breath weapon cone cannot reach flying creature', () => {
    const targeting = { shape: 'cone', length: 15 }
    // sqrt(0² + 30²) = 30 > 15
    assert.equal(geo.isInAoE({ x: 0, y: 0 }, { x: 0, y: 0 }, targeting, { flying: true }), false)
  })

  it('60ft Cone of Cold can reach flying creature at moderate distance', () => {
    const targeting = { shape: 'cone', length: 60 }
    // At 10 squares horizontal = 50ft. sqrt(50² + 30²) = sqrt(3400) ≈ 58.3 ≤ 60
    assert.equal(geo.isInAoE({ x: 10, y: 0 }, { x: 0, y: 0 }, targeting, { flying: true }), true)
  })

  it('60ft cone cannot reach flying creature at max horizontal', () => {
    const targeting = { shape: 'cone', length: 60 }
    // At 11 squares = 55ft. sqrt(55² + 30²) = sqrt(3925) ≈ 62.6 > 60
    assert.equal(geo.isInAoE({ x: 11, y: 0 }, { x: 0, y: 0 }, targeting, { flying: true }), false)
  })
})

describe('isInAoE — flying creatures (cylinder)', () => {
  it('Ice Storm (20ft radius, 40ft height) hits flying creature within radius', () => {
    const targeting = { shape: 'cylinder', radius: 20, height: 40 }
    // horizontal = 0 ≤ 20, altitude 30 ≤ 40
    assert.equal(geo.isInAoE({ x: 5, y: 5 }, { x: 5, y: 5 }, targeting, { flying: true }), true)
  })

  it('cylinder with insufficient height misses flying creature', () => {
    const targeting = { shape: 'cylinder', radius: 20, height: 20 }
    // altitude 30 > 20 height
    assert.equal(geo.isInAoE({ x: 5, y: 5 }, { x: 5, y: 5 }, targeting, { flying: true }), false)
  })

  it('cylinder misses flying creature outside horizontal radius even with sufficient height', () => {
    const targeting = { shape: 'cylinder', radius: 20, height: 40 }
    // horizontal = 5 squares * 5 = 25 > 20
    assert.equal(geo.isInAoE({ x: 10, y: 5 }, { x: 5, y: 5 }, targeting, { flying: true }), false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// canAoEReachFlying — quick check for AI planning
// ═══════════════════════════════════════════════════════════════════════════

describe('canAoEReachFlying', () => {
  it('30ft cube (15ft radius) cannot reach flying altitude', () => {
    assert.equal(geo.canAoEReachFlying({ shape: 'cube', size: 30 }), false)
  })

  it('60ft cube (30ft radius) can reach flying altitude', () => {
    assert.equal(geo.canAoEReachFlying({ shape: 'cube', size: 60 }), true)
  })

  it('20ft sphere cannot reach flying altitude', () => {
    assert.equal(geo.canAoEReachFlying({ shape: 'sphere', radius: 20 }), false)
  })

  it('30ft sphere can reach flying altitude (edge case)', () => {
    assert.equal(geo.canAoEReachFlying({ shape: 'sphere', radius: 30 }), true)
  })

  it('15ft cone cannot reach flying altitude', () => {
    assert.equal(geo.canAoEReachFlying({ shape: 'cone', length: 15 }), false)
  })

  it('60ft cone can reach flying altitude', () => {
    assert.equal(geo.canAoEReachFlying({ shape: 'cone', length: 60 }), true)
  })

  it('40ft-high cylinder can reach flying altitude', () => {
    assert.equal(geo.canAoEReachFlying({ shape: 'cylinder', radius: 20, height: 40 }), true)
  })

  it('20ft-high cylinder cannot reach flying altitude', () => {
    assert.equal(geo.canAoEReachFlying({ shape: 'cylinder', radius: 20, height: 20 }), false)
  })

  it('null targeting returns false', () => {
    assert.equal(geo.canAoEReachFlying(null), false)
  })

  it('wall returns false', () => {
    assert.equal(geo.canAoEReachFlying({ shape: 'wall' }), false)
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
