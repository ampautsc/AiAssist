const { createSession, submitChoice, getSession } = require('./server/combat/CombatSessionManager')
const { GameState } = require('./server/combat/engine-v2/GameState.js')

async function runTest() {
  const Fighter = { 
    id: 'f1', 
    name: 'Heroic Fighter', 
    hp: 30, 
    maxHp: 30, 
    side: 'player', 
    position: { q: 0, r: 0 },
    stats: { str: 16, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
    actions: [
      {
        id: 'attack',
        name: 'Longsword',
        type: 'melee',
        range: 1,
        bonus: 5,
        hit: [{ type: 'damage', dice: '1d8', bonus: 3, damageType: 'slashing' }]
      }
    ]
  }

  const Goblin = {
    id: 'g1',
    name: 'Nasty Goblin',
    hp: 7,
    maxHp: 7,
    side: 'enemy',
    position: { q: 1, r: -1 },
    ac: 10,
    stats: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }
  }

  let state = new GameState({
    combatants: [Fighter, Goblin],
    initiativeOrder: ['f1', 'g1'],
    activeCombatantId: 'f1'
  })

  state = state.withUpdatedCombatant('f1', {
    movementRemaining: 30,
    usedAction: false,
    usedBonusAction: false
  })

  const encounterConfig = {
    combatants: [Fighter, Goblin], testConfig: {
      diceQueue: [
        18, // f1 attack roll (hit ac 10)
        6   // f1 damage roll (6+3 = 9. Goblin dies!)
      ]
    },
    // Adding minimal personality data for the parser
    aiConfig: {
      profileMap: {
        'f1': {
          characterId: 'f1',
          name: 'Heroic Fighter',
          roleplay_style: 'Brave and loud',
          recent_memories: []
        },
        'g1': {
          characterId: 'g1',
          name: 'Nasty Goblin',
          roleplay_style: 'Cowardly. shrieks when hurt.',
          recent_memories: []
        }
      }
    }
  }

  const { sessionId } = createSession(encounterConfig)

  await new Promise(r => setTimeout(r, 100))

  console.log("Submitting attack vs Goblin...")
  const res = submitChoice(sessionId, { optionId: 'attack', targetId: 'g1' })
  
  if (res.error) {
    console.error("Action error:", res.error);
    process.exit(1);
  }

  console.log("Action complete. Waiting 3 seconds for LLM Narrative hook to process...")
  // The narrator should dispatch a call to OpenAI, which usually takes 1-3 seconds.
  await new Promise(r => setTimeout(r, 3500))

  const sessionData = getSession(sessionId)
  console.log("Session Narrative Events:", JSON.stringify(sessionData.narrativeEvents, null, 2))
  
  if (sessionData.narrativeEvents && sessionData.narrativeEvents.length > 0) {
    console.log("✅ Narrative successfully integrated!")
  } else {
    console.log("❌ No narrative generated. Hook might be failing or LLM failing.")
  }

  process.exit(0)
}

runTest().catch(console.error)
