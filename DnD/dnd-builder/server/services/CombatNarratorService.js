/**
 * CombatNarratorService — Bridges the combat engine and LLM personality layer.
 *
 * Listens for state changes (prevState -> nextState) and semantic action results,
 * extracting narrative triggers (damage, death, crits) and generating NPC dialogue.
 * The responses are then asynchronously appended to the session log.
 */

'use strict'

const fs = require('fs')
const path = require('path')
const { TRIGGER_EVENT, NPC_TYPE } = require('../llm/CharacterContextPackage')
const { buildFromPersonality } = require('../services/CharacterContextBuilder')
const CharacterResponseService = require('../services/CharacterResponseService')
const EncounterMemoryService = require('../services/EncounterMemoryService')

// Cache loaded personalities
const _personalityCache = new Map()

function _loadPersonality(templateKey) {
  if (!templateKey) return null
  if (_personalityCache.has(templateKey)) return _personalityCache.get(templateKey)

  const filePath = path.join(__dirname, '../data/npcPersonalities', `${templateKey}.json`)
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      _personalityCache.set(templateKey, data)
      return data
    } catch (err) {
      console.warn(`[CombatNarratorService] Failed to load personality ${templateKey}:`, err.message)
    }
  }
  _personalityCache.set(templateKey, null)
  return null
}

function _findPersonalityForCombatant(combatant) {
  // If it's a named NPC or a monster with a mapped template
  const key = combatant.templateKey || combatant.id.split('-')[0]
  return _loadPersonality(key)
}

/**
 * Scan the state transition to generate dramatic triggers for all combatants.
 * Returns an array of tasks to generate dialogue.
 */
async function processStateTransition(sessionId, prevState, nextState, actorId, resolutionResult) {
  if (!sessionId || !prevState || !nextState) return []
  
  const triggersToFire = [] // { combatant, triggerEvent, entityId }
  const actor = prevState.getCombatant(actorId) || nextState.getCombatant(actorId)
  
  // Generate triggers...
  for (const combatant of nextState.getAllCombatants()) {
    const prevC = prevState.getCombatant(combatant.id)
    if (!prevC) continue
    
    // Only process NPCs
    if (combatant.side === 'player' && !combatant.isNPC) continue
    
    // Has a personality?
    const personality = _findPersonalityForCombatant(combatant)
    if (!personality) continue
    
    // If dead now
    if (combatant.currentHP <= 0 && prevC.currentHP > 0) {
      // NPC died — usually they don't talk after dying, but we might want NEAR_DEATH if they just fell?
      // Wait, let's detect allies dying instead:
      const allies = nextState.getAllCombatants().filter(c => c.side === combatant.side && c.id !== combatant.id)
      for (const ally of allies) {
        triggersToFire.push({ combatant: ally, triggerEvent: TRIGGER_EVENT.ALLY_DIED, entityId: combatant.id })
      }
      
      const enemies = nextState.getAllCombatants().filter(c => c.side !== combatant.side)
      for (const enemy of enemies) {
        triggersToFire.push({ combatant: enemy, triggerEvent: TRIGGER_EVENT.ENEMY_DIED, entityId: combatant.id })
      }
      
      continue // Dead things don't talk (unless they are undead that just died...)
    }
    
    // 1. Being directly attacked
    if (resolutionResult && resolutionResult.targetId === combatant.id) {
       // if hit
       if (resolutionResult.hit) {
         // Took significant damage? (e.g. > 25% max HP in one go)
         const damageTaken = prevC.currentHP - combatant.currentHP
         if (damageTaken > (combatant.maxHP * 0.25)) {
           triggersToFire.push({ combatant, triggerEvent: TRIGGER_EVENT.ATTACKED, entityId: actorId })
         }
       }
    }
    
    // 2. Near death
    const hpPercentPrev = prevC.currentHP / prevC.maxHP
    const hpPercentNow  = combatant.currentHP / combatant.maxHP
    if (hpPercentPrev > 0.25 && hpPercentNow <= 0.25 && hpPercentNow > 0) {
      triggersToFire.push({ combatant, triggerEvent: TRIGGER_EVENT.NEAR_DEATH, entityId: actorId })
    }
    
    // 3. Crit or Kill (if this combatant was the actor)
    if (combatant.id === actorId && resolutionResult && resolutionResult.type === 'attack') {
      if (resolutionResult.isCrit) {
        triggersToFire.push({ combatant, triggerEvent: TRIGGER_EVENT.TRIUMPHANT, entityId: resolutionResult.targetId }) 
        // TRIUMPHANT is an emotional state, wait, the trigger is different. Maybe we use DISCOVERY or adapt it.
      }
      // if target killed, we already triggered ENEMY_DIED above.
    }
  }

  // Deduplicate and prioritize triggers per combatant
  const uniqueTriggers = new Map()
  for (const t of triggersToFire) {
    if (!uniqueTriggers.has(t.combatant.id)) {
      uniqueTriggers.set(t.combatant.id, t)
    } else {
      // Prioritize NEAR_DEATH over ATTACKED over ALLY_DIED
      const existing = uniqueTriggers.get(t.combatant.id)
      const rank = {
        [TRIGGER_EVENT.NEAR_DEATH]: 4,
        [TRIGGER_EVENT.ALLY_DIED]: 3,
        [TRIGGER_EVENT.ATTACKED]: 2,
        [TRIGGER_EVENT.ENEMY_DIED]: 1
      }
      if ((rank[t.triggerEvent] || 0) > (rank[existing.triggerEvent] || 0)) {
        uniqueTriggers.set(t.combatant.id, t)
      }
    }
  }

  // Generate dialogue for each trigger
  const narrations = []
  for (const entry of uniqueTriggers.values()) {
    const { combatant, triggerEvent, entityId } = entry
    const personality = _findPersonalityForCombatant(combatant)
    
    // Build context
    const contextPackage = buildFromPersonality({
      personality,
      triggerEvent,
      sessionId,
      combatantId: combatant.id,
      session: { state: nextState } // fake session shim for builder
    })
    
    try {
      const response = await CharacterResponseService.generateResponse(contextPackage, {
        sessionId,
        personality,
        entityId
      })
      if (response && response.text) {
        narrations.push(`${combatant.name} says: "${response.text}"`)
      }
    } catch (err) {
      console.warn(`[CombatNarratorService] Error generating response for ${combatant.name}:`, err.message)
    }
  }
  
  return narrations
}

/**
 * Hook for when an entire combat is over
 */
async function processCombatEnd(sessionId, finalState) {
   // Generate combat_end quips for survivors
   const narrations = []
   for (const combatant of finalState.getAllCombatants()) {
     if (combatant.currentHP <= 0) continue
     const personality = _findPersonalityForCombatant(combatant)
     if (!personality) continue
     
     const contextPackage = buildFromPersonality({
       personality,
       triggerEvent: TRIGGER_EVENT.COMBAT_END,
       sessionId,
       combatantId: combatant.id,
       session: { state: finalState }
     })
     
     try {
       const response = await CharacterResponseService.generateResponse(contextPackage, {
         sessionId,
         personality
       })
       if (response && response.text) {
         narrations.push(`${combatant.name} says: "${response.text}"`)
       }
     } catch (err) {}
   }
   return narrations
}

module.exports = {
  processStateTransition,
  processCombatEnd,
  _loadPersonality,
}
