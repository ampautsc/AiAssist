/**
 * useEncounterSession — React hook managing the encounter conversation lifecycle.
 *
 * Thin communication bridge to the server. No business logic — all
 * conversation rules enforced server-side.
 *
 * Same pattern as useCombatSession.js.
 */

import { useState, useCallback, useRef } from 'react'
import * as api from './encounterApi.js'

/**
 * @typedef {Object} EncounterSessionState
 * @property {string|null}  encounterId
 * @property {Array}        npcs           - NPC participants
 * @property {Array}        messages       - All conversation messages
 * @property {Object|null}  worldContext   - { location, timeOfDay, tone }
 * @property {boolean}      isSending      - Waiting for NPC response
 * @property {string}       status         - 'idle' | 'active' | 'ended'
 * @property {string|null}  error          - Last error message
 */

export function useEncounterSession() {
  const [encounterId, setEncounterId] = useState(null)
  const [npcs, setNpcs]               = useState([])
  const [messages, setMessages]       = useState([])
  const [worldContext, setWorldContext] = useState(null)
  const [isSending, setIsSending]     = useState(false)
  const [status, setStatus]           = useState('idle')
  const [error, setError]             = useState(null)

  const encounterIdRef = useRef(null)

  // ── Create Encounter ───────────────────────────────────────────────────

  const createEncounter = useCallback(async (config) => {
    setIsSending(true)
    setError(null)
    try {
      const result = await api.createEncounter(config)
      encounterIdRef.current = result.encounterId
      setEncounterId(result.encounterId)
      setNpcs(result.npcs)
      setMessages(result.messages)
      setWorldContext(result.worldContext)
      setStatus('active')
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsSending(false)
    }
  }, [])

  // ── Send Message ─────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text, addressedTo) => {
    if (!encounterIdRef.current) return null
    setIsSending(true)
    setError(null)
    try {
      const result = await api.sendMessage(encounterIdRef.current, {
        text,
        addressedTo,
      })

      // Append player message + NPC responses to local state
      setMessages(prev => [
        ...prev,
        result.playerMessage,
        ...result.npcResponses,
      ])

      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setIsSending(false)
    }
  }, [])

  // ── End Encounter ────────────────────────────────────────────────────────

  const endEncounter = useCallback(async () => {
    if (!encounterIdRef.current) return
    setError(null)
    try {
      await api.endEncounter(encounterIdRef.current)
      setStatus('ended')
    } catch (err) {
      setError(err.message)
    }
  }, [])

  // ── Reset (start fresh) ─────────────────────────────────────────────────

  const reset = useCallback(() => {
    encounterIdRef.current = null
    setEncounterId(null)
    setNpcs([])
    setMessages([])
    setWorldContext(null)
    setStatus('idle')
    setError(null)
    setIsSending(false)
  }, [])

  return {
    // State
    encounterId,
    npcs,
    messages,
    worldContext,
    isSending,
    status,
    error,

    // Actions
    createEncounter,
    sendMessage,
    endEncounter,
    reset,
  }
}
