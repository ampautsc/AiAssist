/**
 * TurnMenu — Zero-trust option generation and validation for engine-v2.
 *
 * Given a GameState and the active combatant, generates a complete menu of
 * legal options. The engine is the sole authority on what actions are valid.
 * Players (human or AI) can only pick from the options presented.
 *
 * Two-level menu structure:
 *   Level 1: Categories  (Action, Bonus Action, Movement, End Turn)
 *   Level 2: Specifics   (which attack, which spell, etc.)
 *
 * Design:
 *   - Pure functions: stateless, deterministic given same inputs
 *   - Imports spell registry for spell metadata
 *   - Imports mechanics for distance calculations
 *   - Each option has a unique optionId
 *   - validateChoice() re-verifies legality before execution
 *
 * D&D 5e 2014 Rules enforced:
 *   - Action economy (one action, one bonus action per turn)
 *   - Spell slot availability
 *   - Spell known / cantrip known
 *   - Bonus-action spell restriction (only cantrips as action after casting BA spell)
 *   - Range / reach validation for attacks and spells
 *   - Concentration awareness (notes if casting will break concentration)
 *   - Incapacitated creatures cannot act
 *   - Dead creatures get no options
 *   - Resource tracking (bardic inspiration uses, breath weapon, etc.)
 */

'use strict'

const { SPELLS, getSpell, hasSpell } = require('../data/spells')
const mech = require('../engine/mechanics')

// ── Constants ────────────────────────────────────────────────────────────────

const INCAPACITATING_CONDITIONS = new Set([
  'paralyzed', 'stunned', 'unconscious', 'charmed_hp', 'incapacitated',
])

/** Flying creatures hover at this altitude above the battlefield (feet). */
const FLYING_ALTITUDE_FT = 30

// ── Internal Helpers ─────────────────────────────────────────────────────────

/** Chebyshev distance between two positions, in feet (D&D grid). */
function gridDistance(pos1, pos2) {
  const p1 = pos1 || {}
  const p2 = pos2 || {}

  // Use hex axial (q, r) distance if either position carries hex coords.
  // Hex cube distance: max(|dq|, |dr|, |dq+dr|)  × 5 ft per hex.
  // When mixing coordinate systems (e.g. stored {x,y} origin vs incoming {q,r}
  // choice), missing keys default to 0 via the ?? operator so the calculation
  // still produces the correct displacement from the origin hex.
  if (p1.q != null || p1.r != null || p2.q != null || p2.r != null) {
    const dq = (p1.q ?? 0) - (p2.q ?? 0)
    const dr = (p1.r ?? 0) - (p2.r ?? 0)
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq - dr)) * 5
  }

  // Legacy Cartesian {x, y} positions — Chebyshev distance (used by AI tactics
  // engine and any code that still uses integer grid squares).
  const dx = Math.abs((p1.x ?? 0) - (p2.x ?? 0))
  const dy = Math.abs((p1.y ?? 0) - (p2.y ?? 0))
  return Math.max(dx, dy) * 5
}

/**
 * Combat distance between two combatants, accounting for flying altitude.
 * Ground-to-ground or flying-to-flying: standard Chebyshev grid distance.
 * Flying vs ground: 3D Euclidean with FLYING_ALTITUDE_FT, rounded to nearest 5ft.
 */
function combatDistance(creature1, creature2) {
  const horizontal = gridDistance(creature1.position, creature2.position)
  const c1Flying = !!creature1.flying
  const c2Flying = !!creature2.flying

  if (c1Flying === c2Flying) return horizontal

  const dist3d = Math.sqrt(horizontal * horizontal + FLYING_ALTITUDE_FT * FLYING_ALTITUDE_FT)
  return Math.round(dist3d / 5) * 5
}

/**
 * Distance from a creature to a ground-level point (e.g. AoE center).
 * Accounts for the creature's flying altitude if applicable.
 */
function creatureToPointDistance(creature, point) {
  const horizontal = gridDistance(creature.position, point)
  if (!creature.flying) return horizontal

  const dist3d = Math.sqrt(horizontal * horizontal + FLYING_ALTITUDE_FT * FLYING_ALTITUDE_FT)
  return Math.round(dist3d / 5) * 5
}

/** Check if creature is incapacitated (can't take actions). */
function isIncapacitated(creature) {
  return (creature.conditions || []).some(c => INCAPACITATING_CONDITIONS.has(c))
}

/** Get alive enemies of a combatant from the state. */
function getAliveEnemies(state, combatantId) {
  const actor = state.getCombatant(combatantId)
  if (!actor) return []
  return state.getAllCombatants().filter(
    c => c.side !== actor.side && c.currentHP > 0
  )
}

/** Get alive allies (excluding self) of a combatant from the state. */
function getAliveAllies(state, combatantId) {
  const actor = state.getCombatant(combatantId)
  if (!actor) return []
  return state.getAllCombatants().filter(
    c => c.side === actor.side && c.currentHP > 0 && c.id !== combatantId
  )
}

/** Get all alive combatants from the state. */
function getAliveCombatants(state) {
  return state.getAllCombatants().filter(c => c.currentHP > 0)
}

// ── Category Generation ──────────────────────────────────────────────────────

/**
 * Get available top-level categories for a combatant's turn.
 *
 * @param {GameState} state
 * @param {string}    combatantId
 * @returns {Array<{ id: string, label: string, available: boolean }>}
 */
function getCategories(state, combatantId) {
  const actor = state.getCombatant(combatantId)
  if (!actor || actor.currentHP <= 0) return []

  const incap = isIncapacitated(actor)

  return [
    {
      id: 'action',
      label: 'Action',
      available: !incap && !actor.usedAction,
    },
    {
      id: 'bonusAction',
      label: 'Bonus Action',
      available: !incap && !actor.usedBonusAction,
    },
    {
      id: 'movement',
      label: `Movement (${actor.movementRemaining || 0}ft)`,
      available: !incap && (actor.movementRemaining || 0) > 0,
    },
    {
      id: 'endTurn',
      label: 'End Turn',
      available: true,
    },
  ]
}

// ── Action Options ───────────────────────────────────────────────────────────

/**
 * Generate all legal Action options for a combatant.
 *
 * @param {GameState} state
 * @param {string}    combatantId
 * @returns {Array<object>} Action option objects
 */
function getActionOptions(state, combatantId) {
  const actor = state.getCombatant(combatantId)
  if (!actor || actor.currentHP <= 0) return []
  if (isIncapacitated(actor)) return []
  if (actor.usedAction) return []

  const options = []
  let nextId = 1
  const enemies = getAliveEnemies(state, combatantId)
  const allies = getAliveAllies(state, combatantId)
  const canOnlyCastCantrips = actor.bonusActionSpellCastThisTurn === true

  // ── Weapon Attacks ──────────────────────────────────────────────────────
  // Two multiattack patterns (determined by multiattackWeapons field):
  //
  // 1. Distinct-weapon multiattack (T-Rex: Bite + Tail on different targets).
  //    multiattackWeapons: ['Bite','Tail']  →  each offered as separate attack.
  //    Weapons already used this turn are excluded, and the "can't attack
  //    the same target" rule is enforced by hiding already-struck targets.
  //    The action is only fully consumed once all weapons have been used.
  //
  // 2. Same-weapon multiattack (Giant Ape: Fist ×2, Brute: Greataxe ×2).
  //    multiattackWeapons: ['Fist','Fist']  →  single "Multiattack" option.
  //    Other weapons (e.g. Rock) remain available as individual attacks.
  //
  const weapons = actor.weapons || []
  // Use multiattackWeapons if specified (e.g. Giant Ape: ['Fist','Fist']),
  // otherwise fall back to all weapon names for backwards compatibility.
  const multiattackWeaponList = actor.multiattackWeapons || weapons.map(w => w.name)
  const uniqueMultiattackWeapons = new Set(multiattackWeaponList)
  const hasDistinctWeapons = actor.multiattack > 0 && uniqueMultiattackWeapons.size > 1
  const usedWeapons = actor.multiattackWeaponsUsed || []
  // Target id that was already hit by another multiattack weapon this turn
  const multiattackExcludedTargetId = actor.multiattackBiteTargetId || null

  for (let wi = 0; wi < weapons.length; wi++) {
    const weapon = weapons[wi]
    const weaponRange = weapon.range || (weapon.type === 'ranged' ? 80 : 5)

    // For distinct-weapon multiattack, skip weapons already used this turn
    if (hasDistinctWeapons && usedWeapons.includes(weapon.name)) continue

    for (const enemy of enemies) {
      // Enforce "can't make attacks against the same target" for distinct weapons
      if (hasDistinctWeapons && multiattackExcludedTargetId && enemy.id === multiattackExcludedTargetId) continue

      const dist = combatDistance(actor, enemy)
      if (dist <= weaponRange) {
        options.push({
          optionId: `action-${nextId++}`,
          category: 'action',
          type: 'attack',
          weaponIndex: wi,
          weaponName: weapon.name,
          targetId: enemy.id,
          targetName: enemy.name,
          label: `Attack ${enemy.name} with ${weapon.name}`,
        })
      }
    }
  }

  // ── Same-weapon Multiattack (e.g. Brute: Greataxe ×2, Giant Ape: Fist ×2) ─
  if (actor.multiattack > 0 && !hasDistinctWeapons && weapons.length > 0) {
    // Pick the multiattack weapon by name (not just weapons[0])
    const multiattackWeaponName = multiattackWeaponList[0] || weapons[0]?.name
    const weapon = weapons.find(w => w.name === multiattackWeaponName) || weapons[0]
    const weaponRange = weapon.range || (weapon.type === 'ranged' ? 80 : 5)

    for (const enemy of enemies) {
      const dist = combatDistance(actor, enemy)
      if (dist <= weaponRange) {
        options.push({
          optionId: `action-${nextId++}`,
          category: 'action',
          type: 'multiattack',
          targetId: enemy.id,
          targetName: enemy.name,
          attackCount: actor.multiattack,
          label: `Multiattack ${enemy.name} (${actor.multiattack} attacks)`,
        })
      }
    }
  }

  // ── Cantrips (always available, regardless of bonus-action spell) ───────
  for (const cantripName of (actor.cantrips || [])) {
    if (!hasSpell(cantripName)) continue
    const spellDef = getSpell(cantripName)
    if (spellDef.castingTime !== 'action') continue

    addSpellOption(options, nextId, actor, spellDef, 0, enemies, allies)
    nextId = options.length + 1
  }

  // ── Leveled Spells (action-time) ────────────────────────────────────────
  if (!canOnlyCastCantrips) {
    for (const spellName of (actor.spellsKnown || [])) {
      if (!hasSpell(spellName)) continue
      const spellDef = getSpell(spellName)
      if (spellDef.castingTime !== 'action') continue
      if (spellDef.level === 0) continue // cantrips handled above

      // Offer at each slot level >= base level where slots are available
      for (let slotLevel = spellDef.level; slotLevel <= 9; slotLevel++) {
        if ((actor.spellSlots?.[slotLevel] || 0) > 0) {
          addSpellOption(options, options.length + 1, actor, spellDef, slotLevel, enemies, allies)
        }
      }
    }
  }

  // ── Standard Actions ────────────────────────────────────────────────────
  const actionId = () => `action-${options.length + 1}`

  // ── Loot Corpse (exploration: action to loot adjacent corpses) ────────
  const corpses = state.getUnlootedCorpses ? state.getUnlootedCorpses() : []
  for (const corpse of corpses) {
    const dist = gridDistance(actor.position, corpse.position)
    if (dist <= 5) {
      options.push({
        optionId: actionId(),
        category: 'action',
        type: 'loot_corpse',
        corpseId: corpse.id,
        corpseName: corpse.name,
        label: `Loot ${corpse.name}'s corpse`,
      })
    }
  }

  // ── Shake Awake (end charmed_hp on adjacent ally) ─────────────────────
  const charmedAllies = allies.filter(a =>
    (a.conditions || []).includes('charmed_hp') &&
    combatDistance(actor, a) <= 5
  )
  for (const ally of charmedAllies) {
    options.push({
      optionId: actionId(),
      category: 'action',
      type: 'shake_awake',
      label: `Shake awake ${ally.name}`,
      targetId: ally.id,
    })
  }

  // ── Breath Weapon (Dragonborn racial) ──────────────────────────────────
  if (actor.breathWeapon && actor.breathWeapon.uses > 0) {
    const bw = actor.breathWeapon
    const range = bw.range || 15
    options.push({
      optionId: actionId(),
      category: 'action',
      type: 'breath_weapon',
      label: `Breath Weapon (${bw.damageType || 'fire'})`,
      targetType: 'area',
      castRange: range,
      aoeShape: bw.targeting?.shape || 'cone',
      aoeSize: bw.targeting?.length || bw.targeting?.radius || range,
      requiresPosition: true,
    })
  }

  // ── Dragon Fear (Dragonborn feat) ──────────────────────────────────────
  // Dragon Fear shares the same PB pool as Breath Weapon.
  // Gate on breathWeapon.uses > 0 (shared pool) AND dragonFear exists.
  if (actor.dragonFear && actor.breathWeapon && actor.breathWeapon.uses > 0) {
    const df = actor.dragonFear
    const range = df.range || 30
    options.push({
      optionId: actionId(),
      category: 'action',
      type: 'dragon_fear',
      label: 'Dragon Fear',
      targetType: 'area',
      castRange: range,
      aoeShape: df.targeting?.shape || 'cone',
      aoeSize: df.targeting?.length || df.targeting?.radius || range,
      requiresPosition: true,
    })
  }

  options.push({
    optionId: actionId(),
    category: 'action',
    type: 'dodge',
    label: 'Dodge',
  })

  options.push({
    optionId: actionId(),
    category: 'action',
    type: 'dash',
    label: 'Dash',
  })

  options.push({
    optionId: actionId(),
    category: 'action',
    type: 'disengage',
    label: 'Disengage',
  })

  return options
}

/**
 * Add a spell option to the options array.
 * For single-target: includes validTargets list.
 * For area: includes cast range and targeting metadata.
 * For self: no target required.
 */
function addSpellOption(options, startId, actor, spellDef, slotLevel, enemies, allies) {
  const targeting = spellDef.targeting || {}
  const range = spellDef.range || 0
  const levelLabel = slotLevel === 0 ? '' : ` (${ordinal(slotLevel)} level)`
  const concentrationNote = spellDef.concentration && actor.concentrating
    ? ' [breaks concentration]' : ''

  if (targeting.type === 'single') {
    // Determine valid targets based on spell
    const isHeal = !!(spellDef.healing)
    const isSelfOrEnemy = !!(spellDef.special && (spellDef.special.includes('self_buff') || spellDef.special.includes('enemy_nerf')))
    const isHostile = !isHeal
    let candidates
    if (isSelfOrEnemy) {
      // Spells like Polymorph can target both enemies and self
      candidates = [...enemies, actor]
    } else {
      candidates = isHostile ? enemies : [actor, ...allies]
    }

    const validTargets = candidates
      .filter(t => combatDistance(actor, t) <= range || t.id === actor.id)
      .map(t => {
        const entry = { id: t.id, name: t.name }
        // Attach per-target beast forms for Polymorph-style spells
        if (spellDef.beastForms) {
          const maxCR = t.characterLevel || t.cr || 0
          const isSelf = t.id === actor.id
          if (isSelf && spellDef.beastForms.self) {
            entry.beastForms = spellDef.beastForms.self.filter(f => f.cr <= maxCR)
          } else if (!isSelf && spellDef.beastForms.enemy) {
            // Enemy: offer the default enemy form (e.g. Sheep)
            const enemyForm = spellDef.beastForms.enemy
            entry.beastForms = [enemyForm]
            // Also include self-buff forms that fit the enemy's CR
            if (spellDef.beastForms.self) {
              for (const f of spellDef.beastForms.self) {
                if (f.cr <= maxCR) entry.beastForms.push(f)
              }
            }
          }
        }
        return entry
      })

    if (validTargets.length > 0) {
      const hasBeastForms = validTargets.some(t => t.beastForms && t.beastForms.length > 0)
      options.push({
        optionId: `action-${options.length + 1}`,
        category: 'action',
        type: 'spell',
        spellName: spellDef.name,
        slotLevel,
        targetType: 'single',
        validTargets,
        ...(hasBeastForms ? { needsBeastForm: true } : {}),
        concentrationWarning: !!(spellDef.concentration && actor.concentrating),
        label: `${spellDef.name}${levelLabel}${concentrationNote}`,
      })
    }
  } else if (targeting.type === 'area') {
    options.push({
      optionId: `action-${options.length + 1}`,
      category: 'action',
      type: 'spell',
      spellName: spellDef.name,
      slotLevel,
      targetType: 'area',
      castRange: range,
      aoeShape: targeting.shape,
      aoeSize: targeting.size || targeting.radius || targeting.length || 0,
      requiresPosition: true,
      concentrationWarning: !!(spellDef.concentration && actor.concentrating),
      label: `${spellDef.name}${levelLabel}${concentrationNote}`,
    })
  } else if (targeting.type === 'self') {
    options.push({
      optionId: `action-${options.length + 1}`,
      category: 'action',
      type: 'spell',
      spellName: spellDef.name,
      slotLevel,
      targetType: 'self',
      concentrationWarning: !!(spellDef.concentration && actor.concentrating),
      label: `${spellDef.name}${levelLabel}${concentrationNote}`,
    })
  }
}

/** Ordinal string for a number: 1→"1st", 2→"2nd", 3→"3rd", etc. */
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// ── Bonus Action Options ─────────────────────────────────────────────────────

/**
 * Generate all legal Bonus Action options for a combatant.
 *
 * @param {GameState} state
 * @param {string}    combatantId
 * @returns {Array<object>}
 */
function getBonusActionOptions(state, combatantId) {
  const actor = state.getCombatant(combatantId)
  if (!actor || actor.currentHP <= 0) return []
  if (isIncapacitated(actor)) return []
  if (actor.usedBonusAction) return []

  const options = []
  const enemies = getAliveEnemies(state, combatantId)
  const allies = getAliveAllies(state, combatantId)

  // ── Bonus-action spells ─────────────────────────────────────────────────
  // Check if action already used for a leveled spell (restricts BA spells)
  // For now, we allow BA spells regardless of action spell cast — the
  // restriction only flows in one direction (BA spell → only cantrips for action)
  const allSpells = [...(actor.cantrips || []), ...(actor.spellsKnown || [])]
  for (const spellName of allSpells) {
    if (!hasSpell(spellName)) continue
    const spellDef = getSpell(spellName)
    if (spellDef.castingTime !== 'bonus_action') continue

    const slotLevel = spellDef.level
    // Check slot availability (cantrips don't need slots)
    if (slotLevel > 0 && (actor.spellSlots?.[slotLevel] || 0) <= 0) continue

    // Also offer at higher slot levels
    if (slotLevel > 0) {
      for (let sl = slotLevel; sl <= 9; sl++) {
        if ((actor.spellSlots?.[sl] || 0) > 0) {
          addBonusSpellOption(options, actor, spellDef, sl, enemies, allies)
        }
      }
    } else {
      addBonusSpellOption(options, actor, spellDef, 0, enemies, allies)
    }
  }

  // ── Bardic Inspiration ──────────────────────────────────────────────────
  if (actor.bardicInspiration && actor.bardicInspiration.uses > 0) {
    for (const ally of allies) {
      options.push({
        optionId: `bonus-${options.length + 1}`,
        category: 'bonusAction',
        type: 'bardicInspiration',
        targetId: ally.id,
        targetName: ally.name,
        die: actor.bardicInspiration.die,
        label: `Bardic Inspiration → ${ally.name} (${actor.bardicInspiration.die})`,
      })
    }
  }

  // ── Gem Flight ──────────────────────────────────────────────────────────
  if (actor.gemFlight && actor.gemFlight.uses > 0 && !actor.flying) {
    options.push({
      optionId: `bonus-${options.length + 1}`,
      category: 'bonusAction',
      type: 'gemFlight',
      label: `Activate Gem Flight (${actor.gemFlight.uses} uses remaining)`,
    })
  }

  return options
}

function addBonusSpellOption(options, actor, spellDef, slotLevel, enemies, allies) {
  const targeting = spellDef.targeting || {}
  const range = spellDef.range || 0
  const levelLabel = slotLevel === 0 ? '' : ` (${ordinal(slotLevel)} level)`
  const concentrationNote = spellDef.concentration && actor.concentrating
    ? ' [breaks concentration]' : ''

  if (targeting.type === 'single') {
    const isHeal = !!(spellDef.healing)
    const candidates = isHeal ? [actor, ...allies] : enemies
    const validTargets = candidates
      .filter(t => combatDistance(actor, t) <= range)
      .map(t => ({ id: t.id, name: t.name }))

    if (validTargets.length > 0) {
      options.push({
        optionId: `bonus-${options.length + 1}`,
        category: 'bonusAction',
        type: 'spell',
        spellName: spellDef.name,
        slotLevel,
        targetType: 'single',
        validTargets,
        setsCantripsOnlyRestriction: true,
        concentrationWarning: !!(spellDef.concentration && actor.concentrating),
        label: `${spellDef.name}${levelLabel}${concentrationNote}`,
      })
    }
  } else if (targeting.type === 'area') {
    options.push({
      optionId: `bonus-${options.length + 1}`,
      category: 'bonusAction',
      type: 'spell',
      spellName: spellDef.name,
      slotLevel,
      targetType: 'area',
      castRange: range,
      aoeShape: targeting.shape,
      requiresPosition: true,
      setsCantripsOnlyRestriction: true,
      concentrationWarning: !!(spellDef.concentration && actor.concentrating),
      label: `${spellDef.name}${levelLabel}${concentrationNote}`,
    })
  } else if (targeting.type === 'self') {
    options.push({
      optionId: `bonus-${options.length + 1}`,
      category: 'bonusAction',
      type: 'spell',
      spellName: spellDef.name,
      slotLevel,
      targetType: 'self',
      setsCantripsOnlyRestriction: true,
      concentrationWarning: !!(spellDef.concentration && actor.concentrating),
      label: `${spellDef.name}${levelLabel}${concentrationNote}`,
    })
  }
}

// ── Movement Options ─────────────────────────────────────────────────────────

/**
 * Generate movement options for a combatant.
 * Provides a general "move" option (caller specifies position) and "hold".
 *
 * @param {GameState} state
 * @param {string}    combatantId
 * @returns {Array<object>}
 */
function getMovementOptions(state, combatantId) {
  const actor = state.getCombatant(combatantId)
  if (!actor || actor.currentHP <= 0) return []
  if (isIncapacitated(actor)) return []
  if ((actor.movementRemaining || 0) <= 0) return []

  return [
    {
      optionId: 'move-to',
      category: 'movement',
      type: 'move',
      maxDistance: actor.movementRemaining,
      currentPosition: actor.position,  // pass through as-is (q,r or legacy x,y)
      requiresPosition: true,
      label: `Move (up to ${actor.movementRemaining}ft)`,
    },
    {
      optionId: 'move-hold',
      category: 'movement',
      type: 'hold',
      label: 'Hold Position',
    },
  ]
}

// ── Full Menu ────────────────────────────────────────────────────────────────

/**
 * Generate the complete turn menu for a combatant.
 *
 * @param {GameState} state
 * @param {string}    combatantId
 * @returns {{
 *   categories: Array<{ id: string, label: string, available: boolean }>,
 *   actions: Array<object>,
 *   bonusActions: Array<object>,
 *   movements: Array<object>,
 *   endTurn: { optionId: string, label: string }
 * }}
 */
function getMenu(state, combatantId) {
  const categories = getCategories(state, combatantId)
  const actions = getActionOptions(state, combatantId)
  const bonusActions = getBonusActionOptions(state, combatantId)
  const movements = getMovementOptions(state, combatantId)

  return {
    categories,
    actions,
    bonusActions,
    movements,
    endTurn: { optionId: 'end-turn', type: 'endTurn', label: 'End Turn' },
  }
}

/**
 * Find an option by its optionId in the full menu.
 * @param {object} menu - Return value of getMenu()
 * @param {string} optionId
 * @returns {object|null}
 */
function findOption(menu, optionId) {
  if (optionId === 'end-turn') return menu.endTurn
  const all = [...menu.actions, ...menu.bonusActions, ...menu.movements]
  return all.find(o => o.optionId === optionId) || null
}

// ── Choice Validation ────────────────────────────────────────────────────────

/**
 * Validate a player's choice against the current legal menu.
 *
 * @param {GameState} state
 * @param {string}    combatantId
 * @param {object}    choice - { optionId, targetId?, aoeCenter?, position? }
 * @returns {{ valid: boolean, reason?: string, option?: object }}
 */
function validateChoice(state, combatantId, choice) {
  if (!choice || !choice.optionId) {
    return { valid: false, reason: 'No optionId provided' }
  }

  // End Turn is always valid (for alive combatants)
  if (choice.optionId === 'end-turn') {
    const actor = state.getCombatant(combatantId)
    if (!actor || actor.currentHP <= 0) {
      return { valid: false, reason: 'Dead combatants cannot end turn' }
    }
    return { valid: true, option: { optionId: 'end-turn', type: 'endTurn' } }
  }

  // Generate fresh menu and find the option
  const menu = getMenu(state, combatantId)
  const option = findOption(menu, choice.optionId)
  if (!option) {
    return { valid: false, reason: `Option not available: ${choice.optionId}` }
  }

  // Validate additional parameters based on option type
  if (option.targetType === 'single') {
    if (!choice.targetId) {
      return { valid: false, reason: 'Single-target option requires targetId' }
    }
    const validIds = (option.validTargets || []).map(t => t.id)
    if (!validIds.includes(choice.targetId)) {
      return { valid: false, reason: `Invalid target: ${choice.targetId}` }
    }

    // Beast form validation for Polymorph-style spells
    if (option.needsBeastForm) {
      if (!choice.beastFormName) {
        return { valid: false, reason: 'Polymorph requires beastFormName' }
      }
      const targetEntry = (option.validTargets || []).find(t => t.id === choice.targetId)
      const validForms = targetEntry?.beastForms || []
      if (!validForms.some(f => f.name === choice.beastFormName)) {
        return { valid: false, reason: `Invalid beast form: ${choice.beastFormName}` }
      }
    }
  }

  if (option.targetType === 'area' && option.requiresPosition) {
    if (!choice.aoeCenter) {
      return { valid: false, reason: 'Area spell requires aoeCenter position' }
    }
    // Skip distance check for self-origin cones — aoeCenter is a directional
    // aim point, not a placement point. Cone range is enforced by geometry.
    if (option.aoeShape !== 'cone') {
      const actor = state.getCombatant(combatantId)
      const dist = creatureToPointDistance(actor, choice.aoeCenter)
      if (dist > option.castRange) {
        return {
          valid: false,
          reason: `AoE center out of range: ${dist}ft > ${option.castRange}ft`,
        }
      }
    }
  }

  if (option.type === 'move' && option.requiresPosition) {
    if (!choice.position) {
      return { valid: false, reason: 'Movement requires target position' }
    }
    const dist = gridDistance(option.currentPosition, choice.position)
    if (dist > option.maxDistance) {
      return {
        valid: false,
        reason: `Movement exceeds remaining: ${dist}ft > ${option.maxDistance}ft`,
      }
    }
  }

  return { valid: true, option }
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getCategories,
  getActionOptions,
  getBonusActionOptions,
  getMovementOptions,
  getMenu,
  findOption,
  validateChoice,

  // Exported for testing
  _gridDistance: gridDistance,
  _combatDistance: combatDistance,
  _creatureToPointDistance: creatureToPointDistance,
  _isIncapacitated: isIncapacitated,
  FLYING_ALTITUDE_FT,
}
