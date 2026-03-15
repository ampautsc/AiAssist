/**
 * encounterApi — Thin fetch wrapper for the Encounter Sessions REST API.
 *
 * Same pattern as combatApi.js. No business logic — just fetch → JSON → return.
 */

const BASE = '/api/encounters'

class EncounterApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.name = 'EncounterApiError'
    this.status = status
    this.body = body
  }
}

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== null) {
    opts.body = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, opts)
  } catch (networkErr) {
    throw new EncounterApiError(`Network error: ${networkErr.message}`, 0, null)
  }

  const contentType = res.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    const text = await res.text().catch(() => '')
    throw new EncounterApiError(
      `Server returned non-JSON response (${res.status}): ${text.slice(0, 120)}`,
      res.status,
      null,
    )
  }

  const json = await res.json()

  if (!res.ok) {
    throw new EncounterApiError(
      json.error || `HTTP ${res.status}`,
      res.status,
      json,
    )
  }

  return json.data
}

// ── Encounter CRUD ───────────────────────────────────────────────────────────

/**
 * Create a new encounter session.
 * @param {{ npcTemplateKeys: string[], playerName?: string, worldContext?: Object }} config
 * @returns {Promise<{ encounterId, npcs, messages, worldContext, status }>}
 */
export function createEncounter(config) {
  return request('POST', '', config)
}

/**
 * Get current encounter state.
 * @param {string} encounterId
 * @returns {Promise<{ encounterId, npcs, messages, worldContext, status }>}
 */
export function getEncounter(encounterId) {
  return request('GET', `/${encounterId}`)
}

/**
 * Send a player message and get NPC response(s).
 * @param {string} encounterId
 * @param {{ text: string, addressedTo?: string[] }} params
 * @returns {Promise<{ playerMessage, npcResponses }>}
 */
export function sendMessage(encounterId, params) {
  return request('POST', `/${encounterId}/messages`, params)
}

/**
 * End an encounter session.
 * @param {string} encounterId
 * @returns {Promise<{ encounterId, status, messageCount }>}
 */
export function endEncounter(encounterId) {
  return request('DELETE', `/${encounterId}`)
}

/**
 * List all active encounters.
 * @returns {Promise<Array>}
 */
export function listEncounters() {
  return request('GET', '')
}

/**
 * Get available NPC template keys.
 * @returns {Promise<{ templateKeys: string[] }>}
 */
export function getTemplates() {
  return request('GET', '/../npc/templates')
}
