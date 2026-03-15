/**
 * EncounterViewer — Group chat-style NPC conversation page.
 *
 * Thin UI orchestrator. No business logic — all conversation rules server-side.
 *
 * Layout:
 *   ┌─────────────────────────────────────┐
 *   │  Header bar (encounter info)        │
 *   ├──────────┬──────────────────────────┤
 *   │  NPC     │  Chat messages           │
 *   │  sidebar │  (scrollable)            │
 *   │          │                          │
 *   │          ├──────────────────────────┤
 *   │          │  Text input bar          │
 *   └──────────┴──────────────────────────┘
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useEncounterSession } from '../encounter/useEncounterSession.js'
import * as api from '../encounter/encounterApi.js'
import './EncounterViewer.css'

// ── NPC color palette (cycle for multi-NPC) ──────────────────────────────────
const NPC_COLORS = [
  '#d4a84b', // gold
  '#4ade80', // green
  '#a78bfa', // purple
  '#f87171', // red
  '#4a9eff', // blue
  '#f472b6', // pink
  '#facc15', // yellow
  '#2dd4bf', // teal
]

function getNpcColor(index) {
  return NPC_COLORS[index % NPC_COLORS.length]
}

function getInitials(name) {
  if (!name) return '?'
  const parts = name.trim().replace(/[^a-zA-Z0-9 ]/g, '').split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// ── Setup Panel (shown before encounter starts) ──────────────────────────────

function SetupPanel({ onStart }) {
  const [templates, setTemplates]     = useState([])
  const [selected, setSelected]       = useState([])
  const [playerName, setPlayerName]   = useState('Adventurer')
  const [location, setLocation]       = useState('The Rusty Bucket tavern')
  const [timeOfDay, setTimeOfDay]     = useState('evening')
  const [tone, setTone]               = useState('conversational')
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    api.getTemplates()
      .then(data => {
        setTemplates(data.templateKeys || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const toggleNpc = (key) => {
    setSelected(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key],
    )
  }

  const handleStart = () => {
    if (selected.length === 0) return
    onStart({
      npcTemplateKeys: selected,
      playerName: playerName.trim() || 'Adventurer',
      worldContext: { location, timeOfDay, tone },
    })
  }

  // Categorize templates
  const townsfolk = templates.filter(k => !['archmage', 'bandit', 'cult_fanatic', 'goblin', 'knight', 'lich', 'orc', 'skeleton', 'wolf', 'young_red_dragon', 'zombie'].includes(k))
  const monsters  = templates.filter(k => !townsfolk.includes(k))

  if (loading) return <div className="encounter-setup" data-testid="encounter-setup"><p>Loading NPC templates...</p></div>

  return (
    <div className="encounter-setup" data-testid="encounter-setup">
      <h2>New Encounter</h2>

      <div className="setup-section">
        <label>Your Name</label>
        <input
          type="text"
          value={playerName}
          onChange={e => setPlayerName(e.target.value)}
          className="setup-input"
          data-testid="player-name-input"
        />
      </div>

      <div className="setup-section">
        <label>Location</label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          className="setup-input"
          data-testid="location-input"
        />
      </div>

      <div className="setup-row">
        <div className="setup-section">
          <label>Time of Day</label>
          <select value={timeOfDay} onChange={e => setTimeOfDay(e.target.value)} className="setup-select">
            <option value="dawn">Dawn</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="midnight">Midnight</option>
          </select>
        </div>
        <div className="setup-section">
          <label>Tone</label>
          <select value={tone} onChange={e => setTone(e.target.value)} className="setup-select">
            <option value="conversational">Conversational</option>
            <option value="tense">Tense</option>
            <option value="relaxed">Relaxed</option>
            <option value="mysterious">Mysterious</option>
            <option value="celebratory">Celebratory</option>
            <option value="somber">Somber</option>
          </select>
        </div>
      </div>

      {townsfolk.length > 0 && (
        <div className="setup-section">
          <label>Millhaven Townsfolk</label>
          <div className="npc-grid" data-testid="npc-grid-townsfolk">
            {townsfolk.map(key => (
              <button
                key={key}
                className={`npc-chip${selected.includes(key) ? ' selected' : ''}`}
                onClick={() => toggleNpc(key)}
                data-testid={`npc-chip-${key}`}
              >
                {key.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {monsters.length > 0 && (
        <div className="setup-section">
          <label>Creatures</label>
          <div className="npc-grid" data-testid="npc-grid-monsters">
            {monsters.map(key => (
              <button
                key={key}
                className={`npc-chip${selected.includes(key) ? ' selected' : ''}`}
                onClick={() => toggleNpc(key)}
                data-testid={`npc-chip-${key}`}
              >
                {key.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        className="start-button"
        onClick={handleStart}
        disabled={selected.length === 0}
        data-testid="start-encounter-btn"
      >
        Start Encounter ({selected.length} NPC{selected.length !== 1 ? 's' : ''})
      </button>
    </div>
  )
}

// ── Chat Message Bubble ──────────────────────────────────────────────────────

function ChatMessage({ message, npcIndex, isPlayer }) {
  const color = isPlayer ? '#4a9eff' : getNpcColor(npcIndex)

  return (
    <div
      className={`chat-message ${isPlayer ? 'player' : 'npc'}`}
      data-testid={`chat-message-${message.id}`}
    >
      {!isPlayer && (
        <div className="message-avatar" style={{ borderColor: color, color }}>
          {getInitials(message.senderName)}
        </div>
      )}
      <div className="message-content">
        {!isPlayer && (
          <div className="message-sender" style={{ color }}>
            {message.senderName}
          </div>
        )}
        <div className={`message-bubble ${isPlayer ? 'player-bubble' : 'npc-bubble'}`}>
          {message.text}
        </div>
        <div className="message-meta">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {message.source === 'fallback' && <span className="source-badge fallback">fallback</span>}
        </div>
      </div>
    </div>
  )
}

// ── NPC Sidebar Card ─────────────────────────────────────────────────────────

function NpcCard({ npc, index, isAddressed, onToggle }) {
  const color = getNpcColor(index)

  return (
    <div
      className={`npc-sidebar-card${isAddressed ? ' addressed' : ''}`}
      onClick={() => onToggle(npc.templateKey)}
      style={{ borderColor: isAddressed ? color : 'transparent' }}
      data-testid={`npc-card-${npc.templateKey}`}
    >
      <div className="npc-card-avatar" style={{ borderColor: color, color }}>
        {getInitials(npc.name)}
      </div>
      <div className="npc-card-info">
        <div className="npc-card-name">{npc.name}</div>
        <div className="npc-card-detail">{npc.race} · {npc.disposition}</div>
      </div>
    </div>
  )
}

// ── Main EncounterViewer ─────────────────────────────────────────────────────

export default function EncounterViewer() {
  const encounter = useEncounterSession()
  const [inputText, setInputText]         = useState('')
  const [addressedTo, setAddressedTo]     = useState([])  // empty = all
  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [encounter.messages.length])

  // Focus input on encounter start
  useEffect(() => {
    if (encounter.status === 'active') {
      inputRef.current?.focus()
    }
  }, [encounter.status])

  // Build NPC index map for colors
  const npcIndexMap = useMemo(() => {
    const map = {}
    encounter.npcs.forEach((npc, i) => { map[npc.templateKey] = i })
    return map
  }, [encounter.npcs])

  const handleStart = useCallback(async (config) => {
    try {
      await encounter.createEncounter(config)
    } catch (_) { /* error handled in hook */ }
  }, [encounter.createEncounter])

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || encounter.isSending) return

    setInputText('')
    try {
      await encounter.sendMessage(text, addressedTo.length > 0 ? addressedTo : undefined)
    } catch (_) { /* error handled in hook */ }
  }, [inputText, encounter.sendMessage, encounter.isSending, addressedTo])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  const toggleAddressed = useCallback((templateKey) => {
    setAddressedTo(prev =>
      prev.includes(templateKey)
        ? prev.filter(k => k !== templateKey)
        : [...prev, templateKey],
    )
  }, [])

  const handleEnd = useCallback(async () => {
    await encounter.endEncounter()
  }, [encounter.endEncounter])

  const handleNewEncounter = useCallback(() => {
    encounter.reset()
    setInputText('')
    setAddressedTo([])
  }, [encounter.reset])

  // ── Render ─────────────────────────────────────────────────────────────────

  // Setup screen
  if (encounter.status === 'idle') {
    return (
      <div className="encounter-viewer" data-testid="encounter-viewer">
        <SetupPanel onStart={handleStart} />
      </div>
    )
  }

  return (
    <div className="encounter-viewer" data-testid="encounter-viewer">
      {/* Header */}
      <div className="encounter-header" data-testid="encounter-header">
        <div className="header-info">
          <h3>{encounter.worldContext?.location || 'Encounter'}</h3>
          <span className="header-meta">
            {encounter.worldContext?.timeOfDay} · {encounter.worldContext?.tone}
            {encounter.status === 'ended' && ' · ENDED'}
          </span>
        </div>
        <div className="header-actions">
          {encounter.status === 'active' && (
            <button
              className="header-btn end-btn"
              onClick={handleEnd}
              data-testid="end-encounter-btn"
            >
              End Encounter
            </button>
          )}
          {encounter.status === 'ended' && (
            <button
              className="header-btn new-btn"
              onClick={handleNewEncounter}
              data-testid="new-encounter-btn"
            >
              New Encounter
            </button>
          )}
        </div>
      </div>

      <div className="encounter-body">
        {/* NPC Sidebar */}
        <div className="npc-sidebar" data-testid="npc-sidebar">
          <div className="sidebar-label">
            {addressedTo.length === 0 ? 'Talking to everyone' : `Talking to ${addressedTo.length}`}
          </div>
          {encounter.npcs.map((npc, i) => (
            <NpcCard
              key={npc.templateKey}
              npc={npc}
              index={i}
              isAddressed={addressedTo.length === 0 || addressedTo.includes(npc.templateKey)}
              onToggle={toggleAddressed}
            />
          ))}
          <div className="sidebar-hint">Click to direct messages</div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          <div className="chat-messages" data-testid="chat-messages">
            {encounter.messages.length === 0 && (
              <div className="chat-empty">
                Say something to start the conversation...
              </div>
            )}
            {encounter.messages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                npcIndex={npcIndexMap[msg.sender] ?? 0}
                isPlayer={msg.sender === 'player'}
              />
            ))}
            {encounter.isSending && (
              <div className="typing-indicator" data-testid="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          {encounter.status === 'active' && (
            <div className="chat-input-bar" data-testid="chat-input-bar">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Type a message..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={encounter.isSending}
                rows={1}
                data-testid="chat-input"
              />
              <button
                className="send-button"
                onClick={handleSend}
                disabled={!inputText.trim() || encounter.isSending}
                data-testid="send-btn"
              >
                Send
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Error Toast */}
      {encounter.error && (
        <div className="encounter-error" data-testid="encounter-error">
          {encounter.error}
        </div>
      )}
    </div>
  )
}
