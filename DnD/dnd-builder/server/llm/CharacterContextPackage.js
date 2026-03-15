/**
 * CharacterContextPackage — Canonical input format for the NPC character response AI.
 *
 * This is the contract between the game engine and the LLM layer.
 * Everything the model needs to produce an in-character response is in this package.
 *
 * Three sections:
 *   character        — who this NPC is (static identity)
 *   situationalContext — what is happening right now (dynamic, per-event)
 *   responseConstraints — how to shape the output
 *
 * @module CharacterContextPackage
 */

'use strict'

// ── Enums ─────────────────────────────────────────────────────────────────────

/** Events that can trigger a character response */
const TRIGGER_EVENT = Object.freeze({
  COMBAT_START:       'combat_start',
  ATTACKED:           'attacked',
  ALLY_DIED:          'ally_died',
  ENEMY_DIED:         'enemy_died',
  PLAYER_ADDRESSED:   'player_addressed',
  SPOTTED_ENEMY:      'spotted_enemy',
  NEAR_DEATH:         'near_death',
  COMBAT_END:         'combat_end',
  LEVEL_TRANSITION:   'level_transition',
  DISCOVERY:          'discovery',
  ROUND_START:        'round_start',
  SPELL_CAST:         'spell_cast',
  CONDITION_APPLIED:  'condition_applied',
})

/** NPC alignment to the party */
const NPC_TYPE = Object.freeze({
  ENEMY:    'enemy',
  FRIENDLY: 'friendly',
  NEUTRAL:  'neutral',
})

/** Emotional state at time of trigger */
const EMOTIONAL_STATE = Object.freeze({
  CALM:       'calm',
  ENRAGED:    'enraged',
  FRIGHTENED: 'frightened',
  DESPERATE:  'desperate',
  TRIUMPHANT: 'triumphant',
  GRIEVING:   'grieving',
  SUSPICIOUS: 'suspicious',
  CONFIDENT:  'confident',
})

/** Output format for the generated response */
const RESPONSE_FORMAT = Object.freeze({
  SPOKEN:        'spoken',         // "Die, adventurer!"
  THOUGHT:       'thought',        // Internal monologue
  ACTION_FLAVOR: 'action_flavor',  // Narrator-style: "The lich gestures..."
})

// ── Schema validation helpers ─────────────────────────────────────────────────

function requireString(val, name) {
  if (typeof val !== 'string' || val.trim() === '') {
    throw new Error(`CharacterContextPackage: ${name} must be a non-empty string`)
  }
}

function requireInEnum(val, enumObj, name) {
  if (!Object.values(enumObj).includes(val)) {
    throw new Error(`CharacterContextPackage: ${name} must be one of [${Object.values(enumObj).join(', ')}], got "${val}"`)
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Build and validate a CharacterContextPackage.
 *
 * @param {Object} character - Static identity of the NPC
 * @param {string} character.id
 * @param {string} character.name
 * @param {string} character.race
 * @param {string} character.npcType - NPC_TYPE value
 * @param {Object} character.personality
 * @param {string} character.personality.voice         - e.g. 'gruff', 'eloquent', 'cryptic'
 * @param {string} character.personality.alignment     - e.g. 'chaotic evil'
 * @param {string} character.personality.disposition   - e.g. 'hostile', 'wary', 'friendly'
 * @param {string} character.personality.backstory     - 2–3 sentence origin
 * @param {string[]} character.personality.speechPatterns  - e.g. ['speaks in third person', 'uses archaic words']
 * @param {string[]} character.personality.motivations
 * @param {string[]} character.personality.fears
 * @param {string[]} character.personality.mannerisms
 * @param {Object} character.knowledge
 * @param {string[]} character.knowledge.knownFactions
 * @param {string[]} character.knowledge.knownLocations
 * @param {string[]} character.knowledge.secretsHeld
 * @param {string[]} character.knowledge.languagesSpoken
 * @param {Object} character.relationships
 * @param {string[]} character.relationships.allies
 * @param {string[]} character.relationships.enemies
 * @param {string[]} character.relationships.neutralParties
 * @param {Object} character.stats
 * @param {number} character.stats.intelligence  - D&D score 1–30
 * @param {number} character.stats.wisdom
 * @param {number} character.stats.charisma
 * @param {Object} [character.consciousnessContext] - Deep inner life data (Phase 1 enrichment)
 * @param {string} [character.consciousnessContext.innerMonologue]
 * @param {string} [character.consciousnessContext.currentPreoccupation]
 * @param {string} [character.consciousnessContext.emotionalBaseline]
 * @param {string} [character.consciousnessContext.socialMask]
 * @param {string[]} [character.consciousnessContext.contradictions]
 * @param {string[]} [character.consciousnessContext.internalConflicts]
 * @param {string[]} [character.consciousnessContext.wakeUpQuestions]
 * @param {Object} [character.consciousnessContext.psychologicalProfile]
 * @param {Object} [character.consciousnessContext.conversationPersona]
 *
 * @param {Object} situationalContext - What is happening right now
 * @param {string} situationalContext.triggerEvent     - TRIGGER_EVENT value
 * @param {string} situationalContext.emotionalState   - EMOTIONAL_STATE value
 * @param {Object} situationalContext.combatState
 * @param {number} situationalContext.combatState.hpPercent     - 0–100
 * @param {string[]} situationalContext.combatState.conditions  - e.g. ['frightened', 'poisoned']
 * @param {string[]} situationalContext.combatState.recentActions - last 3 actions taken by this NPC
 * @param {Object} situationalContext.worldContext
 * @param {string} situationalContext.worldContext.location      - e.g. 'dark dungeon'
 * @param {string} situationalContext.worldContext.timeOfDay     - e.g. 'midnight'
 * @param {string} situationalContext.worldContext.tone          - e.g. 'tense', 'epic'
 * @param {Array}  situationalContext.nearbyEntities  - [{name, side, hpStatus, distance}]
 * @param {string[]} situationalContext.recentEvents  - Last 5 significant combat events
 *
 * @param {Object} responseConstraints
 * @param {number} responseConstraints.maxTokens   - Max tokens for the response (default 60)
 * @param {string} responseConstraints.format      - RESPONSE_FORMAT value
 * @param {string[]} responseConstraints.avoidRepetition - Last N responses this NPC gave
 *
 * @returns {Object} Validated CharacterContextPackage
 */
function buildContextPackage(character, situationalContext, responseConstraints = {}) {
  // ── Validate character ───────────────────────────────────────────────────
  requireString(character.id, 'character.id')
  requireString(character.name, 'character.name')
  requireString(character.race, 'character.race')
  requireInEnum(character.npcType, NPC_TYPE, 'character.npcType')

  const personality = character.personality || {}
  const knowledge   = character.knowledge   || {}
  const rels        = character.relationships || {}
  const stats       = character.stats        || {}
  const consciousness = character.consciousnessContext || {}

  // ── Validate situationalContext ──────────────────────────────────────────
  requireInEnum(situationalContext.triggerEvent,   TRIGGER_EVENT,   'situationalContext.triggerEvent')
  requireInEnum(situationalContext.emotionalState, EMOTIONAL_STATE, 'situationalContext.emotionalState')

  const combatState  = situationalContext.combatState  || {}
  const worldContext = situationalContext.worldContext  || {}

  // ── Validate responseConstraints ────────────────────────────────────────
  const format = responseConstraints.format || RESPONSE_FORMAT.SPOKEN
  requireInEnum(format, RESPONSE_FORMAT, 'responseConstraints.format')

  return {
    character: {
      id:      character.id,
      name:    character.name,
      race:    character.race,
      npcType: character.npcType,
      personality: {
        voice:          personality.voice          || 'neutral',
        alignment:      personality.alignment      || 'true neutral',
        disposition:    personality.disposition    || 'neutral',
        backstory:      personality.backstory      || '',
        speechPatterns: Array.isArray(personality.speechPatterns) ? personality.speechPatterns : [],
        motivations:    Array.isArray(personality.motivations)    ? personality.motivations    : [],
        fears:          Array.isArray(personality.fears)          ? personality.fears          : [],
        mannerisms:     Array.isArray(personality.mannerisms)     ? personality.mannerisms     : [],
      },
      knowledge: {
        knownFactions:    Array.isArray(knowledge.knownFactions)    ? knowledge.knownFactions    : [],
        knownLocations:   Array.isArray(knowledge.knownLocations)   ? knowledge.knownLocations   : [],
        secretsHeld:      Array.isArray(knowledge.secretsHeld)      ? knowledge.secretsHeld      : [],
        languagesSpoken:  Array.isArray(knowledge.languagesSpoken)  ? knowledge.languagesSpoken  : ['Common'],
      },
      relationships: {
        allies:         Array.isArray(rels.allies)         ? rels.allies         : [],
        enemies:        Array.isArray(rels.enemies)        ? rels.enemies        : [],
        neutralParties: Array.isArray(rels.neutralParties) ? rels.neutralParties : [],
      },
      stats: {
        intelligence: typeof stats.intelligence === 'number' ? stats.intelligence : 10,
        wisdom:       typeof stats.wisdom       === 'number' ? stats.wisdom       : 10,
        charisma:     typeof stats.charisma     === 'number' ? stats.charisma     : 10,
      },
      consciousnessContext: consciousness.innerMonologue ? {
        innerMonologue:       consciousness.innerMonologue       || '',
        currentPreoccupation: consciousness.currentPreoccupation || '',
        emotionalBaseline:    consciousness.emotionalBaseline    || '',
        socialMask:           consciousness.socialMask           || '',
        contradictions:       Array.isArray(consciousness.contradictions)    ? consciousness.contradictions    : [],
        internalConflicts:    Array.isArray(consciousness.internalConflicts) ? consciousness.internalConflicts : [],
        wakeUpQuestions:      Array.isArray(consciousness.wakeUpQuestions)   ? consciousness.wakeUpQuestions   : [],
        psychologicalProfile: consciousness.psychologicalProfile || null,
        conversationPersona:  consciousness.conversationPersona  || null,
        // Phase 5 — Literary depth fields
        consciousWant:        consciousness.consciousWant        || '',
        unconsciousNeed:      consciousness.unconsciousNeed      || '',
        characterArc:         consciousness.characterArc         || null,
        opinionsAbout:        consciousness.opinionsAbout        || {},
      } : null,
    },
    situationalContext: {
      triggerEvent:   situationalContext.triggerEvent,
      emotionalState: situationalContext.emotionalState,
      combatState: {
        hpPercent:     typeof combatState.hpPercent === 'number' ? combatState.hpPercent : 100,
        conditions:    Array.isArray(combatState.conditions)     ? combatState.conditions    : [],
        recentActions: Array.isArray(combatState.recentActions)  ? combatState.recentActions : [],
      },
      worldContext: {
        location:  worldContext.location  || 'unknown',
        timeOfDay: worldContext.timeOfDay || 'unknown',
        tone:      worldContext.tone      || 'neutral',
      },
      nearbyEntities: Array.isArray(situationalContext.nearbyEntities) ? situationalContext.nearbyEntities : [],
      recentEvents:   Array.isArray(situationalContext.recentEvents)   ? situationalContext.recentEvents   : [],
    },
    responseConstraints: {
      maxTokens:        typeof responseConstraints.maxTokens === 'number' ? responseConstraints.maxTokens : 60,
      format,
      avoidRepetition: Array.isArray(responseConstraints.avoidRepetition) ? responseConstraints.avoidRepetition : [],
    },
  }
}

// ── System prompt builder ─────────────────────────────────────────────────────

/**
 * Build the system-level prompt from a CharacterContextPackage.
 * This is what tells the model WHO the character is.
 *
 * @param {Object} pkg - Result of buildContextPackage()
 * @returns {string}
 */
function buildSystemPrompt(pkg) {
  const { character } = pkg
  const { personality } = character

  const intMod    = Math.floor((character.stats.intelligence - 10) / 2)
  const chaMod    = Math.floor((character.stats.charisma - 10) / 2)
  const smartness = intMod >= 3  ? 'highly intelligent and articulate'
                  : intMod >= 0  ? 'of average intelligence'
                  : intMod >= -2 ? 'not particularly bright'
                  :                'barely coherent and feral'
  const charm     = chaMod >= 3  ? 'naturally charismatic and commanding'
                  : chaMod >= 0  ? 'unremarkable in bearing'
                  :                'gruff and off-putting'

  // ── IDENTITY section (preserved from original) ──────────────────────────
  const lines = [
    '[IDENTITY]',
    `You are ${character.name}, a ${character.race} (${character.npcType}).`,
    personality.backstory ? personality.backstory : '',
    `You are ${smartness} and ${charm}.`,
    `Your alignment is ${personality.alignment}. Your disposition toward the party is ${personality.disposition}.`,
  ]

  if (personality.speechPatterns.length > 0) {
    lines.push(`Your speech patterns: ${personality.speechPatterns.join('; ')}.`)
  }
  if (personality.motivations.length > 0) {
    lines.push(`Your motivations: ${personality.motivations.join(', ')}.`)
  }
  if (personality.fears.length > 0) {
    lines.push(`Your fears: ${personality.fears.join(', ')}.`)
  }
  if (personality.mannerisms.length > 0) {
    lines.push(`Your mannerisms: ${personality.mannerisms.join('; ')}.`)
  }

  // ── INNER LIFE section (new — consciousnessContext) ─────────────────────
  const cc = character.consciousnessContext
  if (cc) {
    lines.push('')
    lines.push('[INNER LIFE]')

    if (cc.currentPreoccupation) {
      lines.push(`Before this moment, you were thinking about: ${cc.currentPreoccupation}`)
    }
    if (cc.emotionalBaseline) {
      lines.push(`Your emotional baseline is ${cc.emotionalBaseline}, but your public face shows: ${cc.socialMask || 'nothing unusual'}.`)
    }
    if (cc.contradictions.length > 0) {
      lines.push(`You contain these contradictions: ${cc.contradictions.join('; ')}.`)
    }
    if (cc.internalConflicts.length > 0) {
      lines.push(`Your unresolved internal conflicts: ${cc.internalConflicts.join('; ')}.`)
    }

    // Psychological profile adds depth to response style
    if (cc.psychologicalProfile) {
      const psych = cc.psychologicalProfile
      if (psych.moralFramework) {
        lines.push(`Your moral framework: ${psych.moralFramework}.`)
      }
      if (Array.isArray(psych.copingMechanisms) && psych.copingMechanisms.length > 0) {
        lines.push(`Your coping mechanisms: ${psych.copingMechanisms.join('; ')}.`)
      }
    }

    // Conversation persona shapes trust and information release
    if (cc.conversationPersona) {
      const cp = cc.conversationPersona
      if (cp.informationRelease) {
        lines.push(`How you release information: ${cp.informationRelease}.`)
      }
      if (Array.isArray(cp.deflectionPatterns) && cp.deflectionPatterns.length > 0) {
        lines.push(`When uncomfortable, you: ${cp.deflectionPatterns.join('; ')}.`)
      }
    }

    // Phase 5 — Wants, Needs, and Character Arc
    if (cc.consciousWant || cc.unconsciousNeed) {
      lines.push('')
      lines.push('[WANTS AND NEEDS]')
      if (cc.consciousWant) {
        lines.push(`What you believe you want: ${cc.consciousWant}`)
      }
      if (cc.unconsciousNeed) {
        lines.push(`What you actually need (you are NOT aware of this, but it shapes your behavior): ${cc.unconsciousNeed}`)
      }
    }

    if (cc.characterArc && cc.characterArc.summary) {
      lines.push('')
      lines.push('[CHARACTER ARC]')
      lines.push(`Your story: ${cc.characterArc.summary}`)
      if (cc.characterArc.startState) {
        lines.push(`Where you are now: ${cc.characterArc.startState}`)
      }
    }

    // Phase 5 — Opinions about other NPCs (only include those currently nearby)
    if (cc.opinionsAbout && Object.keys(cc.opinionsAbout).length > 0) {
      const nearbyNames = (pkg.situationalContext?.nearbyEntities || [])
        .map(e => (e.name || '').toLowerCase())
      const relevantOpinions = Object.entries(cc.opinionsAbout)
        .filter(([key]) => {
          // Include if the NPC key matches any nearby entity name (fuzzy match)
          const keyLower = key.toLowerCase().replace(/_/g, ' ')
          return nearbyNames.some(n => n.includes(keyLower) || keyLower.includes(n.replace(/[^a-z]/g, '')))
        })
      if (relevantOpinions.length > 0) {
        lines.push('')
        lines.push('[OPINIONS ABOUT THOSE PRESENT]')
        for (const [key, opinion] of relevantOpinions) {
          lines.push(`Your private opinion of ${key.replace(/_/g, ' ')}: ${opinion}`)
        }
      }
    }
  }

  // ── KNOWLEDGE AND SECRETS section ───────────────────────────────────────
  const secrets = character.knowledge && character.knowledge.secretsHeld
  if (secrets && secrets.length > 0) {
    lines.push('')
    lines.push('[KNOWLEDGE AND SECRETS]')
    lines.push(`You know things others don't: ${secrets.join('; ')}.`)
    lines.push('You will NOT reveal these directly. You may hint if trust is high enough.')
  }

  // ── RESPONSE GUIDANCE section ───────────────────────────────────────────
  lines.push('')
  lines.push('[RESPONSE GUIDANCE]')
  lines.push(
    `Respond as ${character.name} ONLY. Stay in character. Be concise (1-2 sentences max).`,
  )
  lines.push(
    `Do NOT break character. Do NOT describe yourself in third person unless that is your speech pattern.`,
  )

  if (cc) {
    lines.push(
      `You are NOT a chatbot performing a character. You ARE this person.`,
      `You arrived in this moment already thinking, already feeling, already wanting something.`,
      `If this trigger would genuinely make you feel something, show it. If it wouldn't, don't perform emotion you wouldn't feel.`,
    )
  }

  if (pkg.responseConstraints.format === RESPONSE_FORMAT.ACTION_FLAVOR) {
    lines.push(`Describe your actions in narrator style (third person, present tense).`)
  }

  return lines.filter(l => l.trim() !== '' || l === '').join('\n')
}

/**
 * Build the user-level prompt from a CharacterContextPackage.
 * This is what tells the model WHAT is happening right now.
 *
 * @param {Object} pkg - Result of buildContextPackage()
 * @returns {string}
 */
function buildUserPrompt(pkg) {
  const { situationalContext, character, responseConstraints } = pkg
  const { combatState, worldContext, nearbyEntities, recentEvents, triggerEvent, emotionalState } = situationalContext

  const hpDesc = combatState.hpPercent >= 75 ? 'healthy'
               : combatState.hpPercent >= 50 ? 'wounded'
               : combatState.hpPercent >= 25 ? 'badly wounded'
               :                               'near death'

  const parts = [
    `SITUATION: ${triggerEvent.replace(/_/g, ' ').toUpperCase()}`,
    `Location: ${worldContext.location}. Time: ${worldContext.timeOfDay}. Tone: ${worldContext.tone}.`,
    `You feel: ${emotionalState}. Current HP: ${hpDesc} (${Math.round(combatState.hpPercent)}%).`,
  ]

  if (combatState.conditions.length > 0) {
    parts.push(`Conditions affecting you: ${combatState.conditions.join(', ')}.`)
  }

  if (nearbyEntities.length > 0) {
    const entityList = nearbyEntities
      .map(e => `${e.name} (${e.side}, ${e.hpStatus || 'unknown hp'}, ${e.distance || '?'} ft away)`)
      .join('; ')
    parts.push(`Nearby: ${entityList}.`)
  }

  if (recentEvents.length > 0) {
    parts.push(`Recent events: ${recentEvents.slice(-3).join('; ')}.`)
  }

  if (combatState.recentActions.length > 0) {
    parts.push(`You just: ${combatState.recentActions.slice(-1)[0]}.`)
  }

  if (responseConstraints.avoidRepetition.length > 0) {
    parts.push(`Do NOT repeat these recent responses: "${responseConstraints.avoidRepetition.join('" | "')}"`)
  }

  // ── Evolution summary injection (Phase 5 — permanent personality changes) ─
  // evolutionSummary is an optional string injected by the caller.
  // It contains cross-session permanent personality evolution.
  if (pkg.evolutionSummary) {
    parts.push('')
    parts.push('[PERMANENT GROWTH]')
    parts.push(pkg.evolutionSummary)
  }

  // ── Conversation history injection (Encounter Viewer) ─────────────────
  // conversationHistory is an optional array injected by EncounterSessionService.
  // Each entry: { sender: string, text: string }
  if (Array.isArray(pkg.conversationHistory) && pkg.conversationHistory.length > 0) {
    parts.push('')
    parts.push('[CONVERSATION SO FAR]')
    for (const msg of pkg.conversationHistory.slice(-10)) {
      parts.push(`${msg.sender}: ${msg.text}`)
    }
  }

  // ── Encounter memory injection ──────────────────────────────────────────
  // memorySummary is an optional string injected by the caller (ResponseService)
  // via pkg.memorySummary. It contains session-specific NPC memory.
  if (pkg.memorySummary) {
    parts.push('')
    parts.push('[ENCOUNTER MEMORY]')
    parts.push(pkg.memorySummary)
  }

  parts.push(`\nRespond as ${character.name} now:`)

  return parts.join('\n')
}

// ── Wake-up prompt builder ────────────────────────────────────────────────────

/**
 * Build a wake-up prompt to inject before the NPC's first response in a scene.
 * This primes the model to respond as someone with an ongoing inner life,
 * not a chatbot generating from scratch.
 *
 * @param {Object} pkg - Result of buildContextPackage()
 * @returns {string|null} Wake-up prompt text, or null if no consciousness data
 */
function buildWakeUpPrompt(pkg) {
  const { character } = pkg
  const cc = character.consciousnessContext
  if (!cc) return null

  const lines = []

  lines.push('Before responding, establish your inner state:')
  lines.push(`- You are ${character.name}. You were ${cc.currentPreoccupation || 'lost in thought'} before being interrupted.`)

  if (cc.emotionalBaseline) {
    lines.push(`- Right now you feel: ${cc.emotionalBaseline}. Your public face shows: ${cc.socialMask || 'composure'}.`)
  }

  if (cc.contradictions.length > 0) {
    lines.push(`- You are carrying these unresolved tensions: ${cc.contradictions[0]}.`)
  }

  // Phase 5 — Ground the wake-up in the NPC's conscious want
  if (cc.consciousWant) {
    lines.push(`- What you want right now: ${cc.consciousWant}`)
  }

  // Pick a random wake-up question (deterministic per name length for test stability)
  if (cc.wakeUpQuestions.length > 0) {
    const idx = character.name.length % cc.wakeUpQuestions.length
    lines.push(`- Ask yourself: ${cc.wakeUpQuestions[idx]}`)
  }

  lines.push('- Then respond as yourself — not as a character being played, but as someone who was already thinking before anyone spoke to you.')

  return lines.join('\n')
}

// ── Token modulation for high-drama triggers ──────────────────────────────────

/**
 * High-drama triggers deserve longer responses. This returns a multiplier
 * that the caller can apply to the base maxTokens.
 *
 * @param {string} triggerEvent - TRIGGER_EVENT value
 * @returns {number} Multiplier (1.0 = normal, up to 2.0 for dramatic moments)
 */
function getTokenModulation(triggerEvent) {
  const HIGH_DRAMA = {
    [TRIGGER_EVENT.NEAR_DEATH]:        2.0,
    [TRIGGER_EVENT.ALLY_DIED]:         1.8,
    [TRIGGER_EVENT.DISCOVERY]:         1.5,
    [TRIGGER_EVENT.COMBAT_END]:        1.5,
    [TRIGGER_EVENT.LEVEL_TRANSITION]:  1.3,
    [TRIGGER_EVENT.ENEMY_DIED]:        1.3,
  }
  return HIGH_DRAMA[triggerEvent] || 1.0
}

// ── Relationship-aware nearby entities ────────────────────────────────────────

/**
 * Enrich nearby entity descriptions with relationship context from the NPC's
 * personality data. If the NPC has a defined relationship with a nearby entity,
 * include that relationship in the description.
 *
 * @param {Object} pkg - Result of buildContextPackage()
 * @param {Object} relationships - From personality record {allies, enemies, neutralParties}
 * @returns {string} Formatted string of nearby entities with relationship context
 */
function buildRelationshipContext(pkg, relationships) {
  if (!relationships) return ''
  const { nearbyEntities } = pkg.situationalContext
  if (!nearbyEntities || nearbyEntities.length === 0) return ''

  const allies   = new Set((relationships.allies || []).map(a => a.toLowerCase()))
  const enemies  = new Set((relationships.enemies || []).map(e => e.toLowerCase()))

  const enriched = nearbyEntities.map(entity => {
    const nameLower = (entity.name || '').toLowerCase()
    let relationship = ''

    // Check if any ally/enemy string is contained in or contains the entity name
    for (const ally of allies) {
      if (nameLower.includes(ally) || ally.includes(nameLower)) {
        relationship = ' [your ally]'
        break
      }
    }
    if (!relationship) {
      for (const enemy of enemies) {
        if (nameLower.includes(enemy) || enemy.includes(nameLower)) {
          relationship = ' [your enemy]'
          break
        }
      }
    }

    return `${entity.name}${relationship} (${entity.side}, ${entity.hpStatus || 'unknown hp'}, ${entity.distance || '?'} ft away)`
  })

  return enriched.join('; ')
}

// ── Exports ───────────────────────────────────────────────────────────────

module.exports = {
  TRIGGER_EVENT,
  NPC_TYPE,
  EMOTIONAL_STATE,
  RESPONSE_FORMAT,
  buildContextPackage,
  buildSystemPrompt,
  buildUserPrompt,
  buildWakeUpPrompt,
  getTokenModulation,
  buildRelationshipContext,
}
