'use strict'
/**
 * Conversation quality evaluation script.
 * Creates an encounter with Bree Millhaven and has a multi-turn conversation,
 * logging every response with source/quality metadata.
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

async function main() {
  console.log('=== CONVERSATION QUALITY EVALUATION ===\n')

  // 1. Create encounter
  const enc = await request('POST', '/api/encounters', {
    npcTemplateKeys: ['bree_millhaven'],
    playerName: 'Traveler',
    worldContext: {
      location: 'the Green Gate Bakery in Millhaven',
      timeOfDay: 'morning',
      tone: 'conversational',
    },
  })
  
  if (!enc.data || !enc.data.encounterId) {
    console.error('Failed to create encounter:', JSON.stringify(enc))
    process.exit(1)
  }

  const id = enc.data.encounterId
  console.log(`Encounter: ${id}`)
  console.log(`NPC: ${enc.data.npcs[0].name} (${enc.data.npcs[0].templateKey})`)
  console.log(`Voice: ${enc.data.npcs[0].voice}`)
  console.log(`Disposition: ${enc.data.npcs[0].disposition}`)
  console.log('---\n')

  // 2. Conversation turns
  const messages = [
    "Good morning, Bree. What are you up to today?",
    "That sounds interesting. What kind of herbs does Vesna work with?",
    "Have you ever tried any of them yourself?",
    "What do you think about the adventurers who pass through Millhaven?",
    "If you could go anywhere in the world, where would you go?",
  ]

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    console.log(`--- TURN ${i + 1} ---`)
    console.log(`PLAYER: ${msg}`)
    
    const start = Date.now()
    const res = await request('POST', `/api/encounters/${id}/messages`, {
      text: msg,
    })
    const elapsed = Date.now() - start

    if (!res.data || !res.data.npcResponses || res.data.npcResponses.length === 0) {
      console.log(`BREE: [ERROR - no response] ${JSON.stringify(res)}`)
      continue
    }

    const npc = res.data.npcResponses[0]
    console.log(`BREE: ${npc.text}`)
    console.log(`  [source: ${npc.source}, time: ${elapsed}ms]`)
    console.log('')
  }

  // 3. Summary
  console.log('=== EVALUATION COMPLETE ===')
  
  // Cleanup
  await request('DELETE', `/api/encounters/${id}`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
