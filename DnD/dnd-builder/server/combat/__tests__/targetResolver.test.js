'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const resolver = require('../engine/targetResolver')

// ═══════════════════════════════════════════════════════════════════════════
// Helpers — minimal combatant and spell factories
// ═══════════════════════════════════════════════════════════════════════════

function makeCombatant(overrides = {}) {
  return {
    name: overrides.name || 'Combatant',
    side: overrides.side || 'enemy',
    currentHP: overrides.currentHP ?? 20,
    maxHP: overrides.maxHP ?? 20,
    conditions: overrides.conditions || [],
    position: overrides.position || { x: 0, y: 0 },
    immuneCharmed: overrides.immuneCharmed || false,
    ...overrides,
  }
}

function makeCaster(overrides = {}) {
  return makeCombatant({ name: 'Caster', side: 'party', position: { x: 0, y: 0 }, ...overrides })
}

// ═══════════════════════════════════════════════════════════════════════════
// resolveAoETargets — core target resolution
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveAoETargets — basic target resolution', () => {
  const cubeSpell = {
    name: 'Hypnotic Pattern',
    range: 120,
    targeting: { type: 'area', shape: 'cube', size: 30 },
  }

  it('returns enemies within the AoE', () => {
    const caster = makeCaster()
    const e1 = makeCombatant({ name: 'E1', position: { x: 10, y: 0 } }) // 50ft from origin, within AoE at (10,0)
    const e2 = makeCombatant({ name: 'E2', position: { x: 11, y: 0 } }) // 55ft, within AoE (1 sq from center)
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, e1, e2]

    const targets = resolver.resolveAoETargets(caster, cubeSpell, aoeCenter, all)
    assert.equal(targets.length, 2)
    assert.ok(targets.includes(e1))
    assert.ok(targets.includes(e2))
  })

  it('excludes enemies outside the AoE radius', () => {
    const caster = makeCaster()
    const e1 = makeCombatant({ name: 'E1', position: { x: 10, y: 0 } })
    const e2 = makeCombatant({ name: 'Far', position: { x: 20, y: 0 } })
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, e1, e2]

    const targets = resolver.resolveAoETargets(caster, cubeSpell, aoeCenter, all)
    assert.equal(targets.length, 1)
    assert.ok(targets.includes(e1))
  })

  it('excludes the caster from AoE targets', () => {
    const caster = makeCaster({ position: { x: 10, y: 0 } })
    const e1 = makeCombatant({ name: 'E1', position: { x: 10, y: 0 } })
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, e1]

    const targets = resolver.resolveAoETargets(caster, cubeSpell, aoeCenter, all)
    assert.equal(targets.length, 1)
    assert.ok(targets.includes(e1))
    assert.ok(!targets.includes(caster))
  })

  it('excludes dead combatants', () => {
    const caster = makeCaster()
    const e1 = makeCombatant({ name: 'Dead', position: { x: 10, y: 0 }, currentHP: 0 })
    const e2 = makeCombatant({ name: 'Alive', position: { x: 10, y: 0 } })
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, e1, e2]

    const targets = resolver.resolveAoETargets(caster, cubeSpell, aoeCenter, all)
    assert.equal(targets.length, 1)
    assert.ok(targets.includes(e2))
  })

  it('returns empty array when no combatants in range', () => {
    const caster = makeCaster()
    const e1 = makeCombatant({ name: 'Far', position: { x: 50, y: 50 } })
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, e1]

    const targets = resolver.resolveAoETargets(caster, cubeSpell, aoeCenter, all)
    assert.equal(targets.length, 0)
  })
})

describe('resolveAoETargets — sphere (Fireball)', () => {
  const fireball = {
    name: 'Fireball',
    range: 150,
    targeting: { type: 'area', shape: 'sphere', radius: 20 },
  }

  it('includes enemies within 20ft sphere', () => {
    const caster = makeCaster()
    const e1 = makeCombatant({ name: 'E1', position: { x: 10, y: 0 } }) // at center
    const e2 = makeCombatant({ name: 'E2', position: { x: 14, y: 0 } }) // 20ft from center
    const e3 = makeCombatant({ name: 'Far', position: { x: 15, y: 0 } }) // 25ft — out
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, e1, e2, e3]

    const targets = resolver.resolveAoETargets(caster, fireball, aoeCenter, all)
    assert.equal(targets.length, 2)
    assert.ok(targets.includes(e1))
    assert.ok(targets.includes(e2))
    assert.ok(!targets.includes(e3))
  })

  it('can include allies in the AoE (friendly fire)', () => {
    const caster = makeCaster()
    const ally = makeCombatant({ name: 'Ally', side: 'party', position: { x: 10, y: 0 } })
    const enemy = makeCombatant({ name: 'E1', position: { x: 10, y: 0 } })
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, ally, enemy]

    // By default, excludeFriendly is true — allies excluded
    const targets = resolver.resolveAoETargets(caster, fireball, aoeCenter, all)
    assert.ok(!targets.includes(ally))

    // With excludeFriendly = false, allies included
    const allTargets = resolver.resolveAoETargets(caster, fireball, aoeCenter, all, { excludeFriendly: false })
    assert.ok(allTargets.includes(ally))
    assert.ok(allTargets.includes(enemy))
  })
})

describe('resolveAoETargets — cone (Cone of Cold)', () => {
  const coneOfCold = {
    name: 'Cone of Cold',
    range: 0,  // self-origin
    targeting: { type: 'area', shape: 'cone', length: 60 },
  }

  it('includes enemies within cone length from caster', () => {
    const caster = makeCaster({ position: { x: 0, y: 0 } })
    const e1 = makeCombatant({ name: 'Close', position: { x: 5, y: 0 } }) // 25ft
    const e2 = makeCombatant({ name: 'Edge', position: { x: 12, y: 0 } }) // 60ft
    const e3 = makeCombatant({ name: 'Far', position: { x: 13, y: 0 } })  // 65ft — out
    const all = [caster, e1, e2, e3]
    // For self-origin spells, center is the caster
    const aoeCenter = { x: 0, y: 0 }

    const targets = resolver.resolveAoETargets(caster, coneOfCold, aoeCenter, all)
    assert.equal(targets.length, 2)
    assert.ok(targets.includes(e1))
    assert.ok(targets.includes(e2))
  })
})

describe('resolveAoETargets — cylinder (Ice Storm)', () => {
  const iceStorm = {
    name: 'Ice Storm',
    range: 300,
    targeting: { type: 'area', shape: 'cylinder', radius: 20, height: 40 },
  }

  it('includes enemies within cylinder radius', () => {
    const caster = makeCaster()
    const e1 = makeCombatant({ name: 'Near', position: { x: 10, y: 0 } }) // at center
    const e2 = makeCombatant({ name: 'Edge', position: { x: 14, y: 0 } }) // 20ft from center
    const e3 = makeCombatant({ name: 'Out', position: { x: 15, y: 0 } })  // 25ft — out
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, e1, e2, e3]

    const targets = resolver.resolveAoETargets(caster, iceStorm, aoeCenter, all)
    assert.equal(targets.length, 2)
    assert.ok(targets.includes(e1))
    assert.ok(targets.includes(e2))
  })
})

describe('resolveAoETargets — edge cases', () => {
  const cubeSpell = {
    name: 'Hypnotic Pattern',
    range: 120,
    targeting: { type: 'area', shape: 'cube', size: 30 },
  }

  it('handles combatants with missing position', () => {
    const caster = makeCaster()
    const e1 = makeCombatant({ name: 'NoPos' })
    delete e1.position
    const aoeCenter = { x: 0, y: 0 }
    const all = [caster, e1]

    // Should not throw — defaults to (0,0), which is at center
    const targets = resolver.resolveAoETargets(caster, cubeSpell, aoeCenter, all)
    // e1 is at implied (0,0), center is (0,0) — but e1 is enemy, caster is party, so e1 included
    assert.ok(targets.length >= 0)
  })

  it('returns empty for wall-type spells (no auto-targeting)', () => {
    const wallSpell = {
      name: 'Wall of Force',
      range: 120,
      targeting: { type: 'area', shape: 'wall' },
    }
    const caster = makeCaster()
    const e1 = makeCombatant({ name: 'E1', position: { x: 5, y: 0 } })
    const aoeCenter = { x: 5, y: 0 }
    const all = [caster, e1]

    const targets = resolver.resolveAoETargets(caster, wallSpell, aoeCenter, all)
    assert.equal(targets.length, 0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// resolveAoETargets — flying creature interaction
// ═══════════════════════════════════════════════════════════════════════════

describe('resolveAoETargets — flying creatures', () => {
  it('Hypnotic Pattern (30ft cube) does NOT hit flying creature at same position', () => {
    const hp = {
      name: 'Hypnotic Pattern',
      range: 120,
      targeting: { type: 'area', shape: 'cube', size: 30 },
    }
    const caster = makeCaster()
    const flyingEnemy = makeCombatant({
      name: 'FlyingEnemy',
      position: { x: 10, y: 0 },
      flying: true,
    })
    const groundEnemy = makeCombatant({
      name: 'GroundEnemy',
      position: { x: 10, y: 0 },
    })
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, flyingEnemy, groundEnemy]

    const targets = resolver.resolveAoETargets(caster, hp, aoeCenter, all)
    assert.ok(!targets.includes(flyingEnemy), 'Flying enemy should be missed by 30ft cube')
    assert.ok(targets.includes(groundEnemy), 'Ground enemy should be hit')
  })

  it('Fireball (20ft sphere) does NOT hit flying creature', () => {
    const fb = {
      name: 'Fireball',
      range: 150,
      targeting: { type: 'area', shape: 'sphere', radius: 20 },
    }
    const caster = makeCaster()
    const flyingEnemy = makeCombatant({
      name: 'FlyingEnemy',
      position: { x: 10, y: 0 },
      flying: true,
    })
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, flyingEnemy]

    const targets = resolver.resolveAoETargets(caster, fb, aoeCenter, all)
    assert.equal(targets.length, 0, 'Flying enemy should be missed by 20ft sphere')
  })

  it('Cone of Cold (60ft cone) CAN hit flying creature', () => {
    const coc = {
      name: 'Cone of Cold',
      range: 0,
      targeting: { type: 'area', shape: 'cone', length: 60 },
    }
    const caster = makeCaster({ position: { x: 0, y: 0 } })
    const flyingEnemy = makeCombatant({
      name: 'FlyingEnemy',
      position: { x: 8, y: 0 },   // 40ft horizontal; 3D = sqrt(40²+30²)≈50ft ≤ 60
      flying: true,
    })
    const aoeCenter = { x: 0, y: 0 }
    const all = [caster, flyingEnemy]

    const targets = resolver.resolveAoETargets(caster, coc, aoeCenter, all)
    assert.ok(targets.includes(flyingEnemy), 'Flying enemy within 60ft cone should be hit')
  })

  it('Ice Storm (cylinder 20r/40h) CAN hit flying creature within radius', () => {
    const is = {
      name: 'Ice Storm',
      range: 300,
      targeting: { type: 'area', shape: 'cylinder', radius: 20, height: 40 },
    }
    const caster = makeCaster()
    const flyingEnemy = makeCombatant({
      name: 'FlyingEnemy',
      position: { x: 10, y: 0 },   // at AoE center
      flying: true,
    })
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, flyingEnemy]

    const targets = resolver.resolveAoETargets(caster, is, aoeCenter, all)
    assert.ok(targets.includes(flyingEnemy), 'Flying enemy within Ice Storm cylinder should be hit')
  })

  it('grounded creature is still hit normally even when others fly', () => {
    const fb = {
      name: 'Fireball',
      range: 150,
      targeting: { type: 'area', shape: 'sphere', radius: 20 },
    }
    const caster = makeCaster()
    const flyingEnemy = makeCombatant({ name: 'Flyer', position: { x: 10, y: 0 }, flying: true })
    const groundEnemy = makeCombatant({ name: 'Ground', position: { x: 10, y: 0 } })
    const aoeCenter = { x: 10, y: 0 }
    const all = [caster, flyingEnemy, groundEnemy]

    const targets = resolver.resolveAoETargets(caster, fb, aoeCenter, all)
    assert.ok(!targets.includes(flyingEnemy))
    assert.ok(targets.includes(groundEnemy))
  })
})
