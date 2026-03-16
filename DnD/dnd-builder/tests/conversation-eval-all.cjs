'use strict'
/**
 * Bulk conversation quality evaluation — all 24 rich NPCs.
 * Creates an encounter per NPC, sends 2 turns, logs PASS/FAIL.
 *
 * Run: node tests/conversation-eval-all.cjs
 * Requires: server running on localhost:3001
 */

const http = require('http')

const BASE = 'http://localhost:3001'

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE)
    const data = body ? JSON.stringify(body) : null
    const opts = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method,
      headers: { 'Content-Type': 'application/json' },
    }
    const req = http.request(opts, res => {
      let chunks = ''
      res.on('data', c => chunks += c)
      res.on('end', () => {
        try { resolve(JSON.parse(chunks)) } catch { resolve(chunks) }
      })
    })
    req.on('error', reject)
    if (data) req.write(data)
    req.end()
  })
}

// 24 rich NPCs
const RICH_NPCS = [
  'aldovar_crennick', 'archmage', 'bree_millhaven', 'brennan_holt',
  'brother_aldwin', 'captain_edric_vane', 'davan_merchant', 'dolly_thurn',
  'fen_colby', 'floris_embrich', 'hodge_fence', 'lell_sparrow',
  'lich', 'mira_barrelbottom', 'old_mattock', 'oma_steadwick',
  'pip_apprentice', 'sera_dunwick', 'torval_grimm', 'tuck_millhaven',
  'vesna_calloway', 'widow_marsh', 'wren_stable', 'young_red_dragon',
]

// 8 generic enemies
const GENERIC_NPCS = [
  'bandit', 'cult_fanatic', 'goblin', 'knight',
  'orc', 'skeleton', 'wolf', 'zombie',
]

// Generic openers that work for any NPC
const OPENERS = [
  "Hello there. What brings you to this place?",
  "Tell me about yourself.",
]

const FOLLOWUPS = [
  "What do you want more than anything?",
  "What are you afraid of?",
]

async function testNpc(templateKey, turns) {
  const result = { templateKey, pass: true, turns: [], notes: [] }

  // Create encounter
  let enc
  try {
    enc = await request('POST', '/api/encounters', {
      npcTemplateKeys: [templateKey],
      playerName: 'Traveler',
      worldContext: { location: 'a quiet crossroads', timeOfDay: 'afternoon', tone: 'conversational' },
    })
  } catch (err) {
    result.pass = false
    result.notes.push(`CREATE FAILED: ${err.message}`)
    return result
  }

  if (!enc.data || !enc.data.encounterId) {
    result.pass = false
    result.notes.push(`CREATE FAILED: ${JSON.stringify(enc).slice(0, 200)}`)
    return result
  }

  const id = enc.data.encounterId
  const npcName = enc.data.npcs[0]?.name || templateKey

  for (let i = 0; i < turns.length; i++) {
    const msg = turns[i]
    const start = Date.now()
    let res
    try {
      res = await request('POST', `/api/encounters/${id}/messages`, { text: msg })
    } catch (err) {
      result.pass = false
      result.notes.push(`Turn ${i + 1}: REQUEST FAILED: ${err.message}`)
      continue
    }
    const elapsed = Date.now() - start

    if (!res.data || !res.data.npcResponses || res.data.npcResponses.length === 0) {
      result.pass = false
      result.notes.push(`Turn ${i + 1}: NO RESPONSE`)
      result.turns.push({ player: msg, npc: '[NO RESPONSE]', source: 'none', ms: elapsed })
      continue
    }

    const npc = res.data.npcResponses[0]
    result.turns.push({ player: msg, npc: npc.text, source: npc.source, ms: elapsed })

    // Quality checks
    if (npc.source === 'fallback') {
      result.pass = false
      result.notes.push(`Turn ${i + 1}: FALLBACK response`)
    }
    if (npc.text && npc.text.length < 5) {
      result.pass = false
      result.notes.push(`Turn ${i + 1}: Response too short (${npc.text.length} chars)`)
    }
    // Check for leaked system prompt indicators
    if (npc.text && /\[IDENTITY\]|\[INNER LIFE\]|\[KNOWLEDGE\]|cache_control|templateKey/i.test(npc.text)) {
      result.pass = false
      result.notes.push(`Turn ${i + 1}: LEAKED system prompt`)
    }
  }

  // Cleanup
  try { await request('DELETE', `/api/encounters/${id}`) } catch (_) {}

  if (result.notes.length === 0) result.notes.push('Clean')
  return result
}

async function main() {
  console.log('=== BULK NPC CONVERSATION EVALUATION ===')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Server: ${BASE}`)
  console.log('')

  // Health check
  try {
    const h = await request('GET', '/api/health')
    if (!h.ok) throw new Error('Health check failed')
    console.log('[Health] Server OK\n')
  } catch (err) {
    console.error('[Health] Server not responding:', err.message)
    process.exit(1)
  }

  const results = []
  let passed = 0, failed = 0

  // Rich NPCs: 2 turns each
  console.log('--- RICH NPCs (2 turns each) ---\n')
  for (const key of RICH_NPCS) {
    const turns = [OPENERS[Math.floor(Math.random() * OPENERS.length)], FOLLOWUPS[Math.floor(Math.random() * FOLLOWUPS.length)]]
    process.stdout.write(`  ${key.padEnd(25)}`)
    const r = await testNpc(key, turns)
    results.push(r)
    if (r.pass) {
      passed++
      console.log(`PASS  (${r.turns.map(t => t.ms + 'ms').join(', ')})`)
    } else {
      failed++
      console.log(`FAIL  [${r.notes.join('; ')}]`)
    }
  }

  // Generic NPCs: 1 turn each
  console.log('\n--- GENERIC ENEMIES (1 turn each) ---\n')
  for (const key of GENERIC_NPCS) {
    const turns = ["Who are you? What do you want?"]
    process.stdout.write(`  ${key.padEnd(25)}`)
    const r = await testNpc(key, turns)
    results.push(r)
    if (r.pass) {
      passed++
      console.log(`PASS  (${r.turns.map(t => t.ms + 'ms').join(', ')})`)
    } else {
      failed++
      console.log(`FAIL  [${r.notes.join('; ')}]`)
    }
  }

  // Summary
  console.log(`\n=== RESULTS: ${passed} PASS / ${failed} FAIL / ${results.length} TOTAL ===\n`)

  // Detailed output for failures
  const failures = results.filter(r => !r.pass)
  if (failures.length > 0) {
    console.log('--- FAILURE DETAILS ---\n')
    for (const f of failures) {
      console.log(`[${f.templateKey}] ${f.notes.join('; ')}`)
      for (const t of f.turns) {
        console.log(`  Player: ${t.player}`)
        console.log(`  NPC:    ${t.npc}`)
        console.log(`  [source: ${t.source}, ${t.ms}ms]`)
      }
      console.log('')
    }
  }

  // Full conversation log for ALL NPCs
  console.log('--- FULL CONVERSATION LOG ---\n')
  for (const r of results) {
    console.log(`=== ${r.templateKey} === ${r.pass ? 'PASS' : 'FAIL'}`)
    for (const t of r.turns) {
      console.log(`  Player: ${t.player}`)
      console.log(`  NPC:    ${t.npc}`)
      console.log(`  [${t.source}, ${t.ms}ms]`)
    }
    console.log('')
  }
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
