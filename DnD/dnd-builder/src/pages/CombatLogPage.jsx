/**
 * CombatLogPage.jsx
 *
 * Displays stored combat encounter logs.
 * Fetches from GET /api/sessions (mocked here for local dev).
 * Supports replay of position snapshots via an animated HexMap.
 */

import { useState, useEffect, useCallback } from 'react'
import HexMap from '../components/HexMap'

// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_SESSIONS = [
  {
    id: 'sess-001',
    partyName: 'The Iron Circle',
    type: 'combat',
    status: 'completed',
    startedAt: '2024-03-12T19:00:00Z',
    endedAt:   '2024-03-12T20:15:00Z',
    durationSeconds: 4500,
    round: 4,
    combatLog: [
      { round: 1, turn: 0, actorId: 'Aldric',    action: 'attack',  targetId: 'Goblin Scout', roll: 15, modifier: 5, total: 20, hit: true,  damage: 9,  damageType: 'slashing',  description: 'Aldric swings his battleaxe at Goblin Scout — hits for 9 slashing damage!' },
      { round: 1, turn: 1, actorId: 'Goblin Scout', action: 'attack', targetId: 'Aldric',    roll: 8,  modifier: 4, total: 12, hit: false, damage: 0,  damageType: 'slashing',  description: 'Goblin Scout slashes at Aldric but misses.' },
      { round: 1, turn: 2, actorId: 'Lyra',       action: 'spell',   targetId: 'Goblin Scout', roll: 14, modifier: 6, total: 20, hit: true,  damage: 12, damageType: 'fire',      description: 'Lyra hurls a Fire Bolt — Goblin Scout takes 12 fire damage!' },
      { round: 2, turn: 0, actorId: 'Aldric',    action: 'attack',  targetId: 'Goblin Scout', roll: 18, modifier: 5, total: 23, hit: true,  damage: 11, damageType: 'slashing',  description: 'Aldric finishes off the Goblin Scout with a decisive blow for 11 damage!' },
      { round: 2, turn: 1, actorId: 'Goblin Boss', action: 'attack', targetId: 'Lyra',       roll: 16, modifier: 5, total: 21, hit: true,  damage: 7,  damageType: 'piercing',  description: 'Goblin Boss skewers Lyra with a shortbow for 7 piercing damage!' },
      { round: 3, turn: 0, actorId: 'Lyra',       action: 'spell',   targetId: 'Goblin Boss',  roll: 19, modifier: 6, total: 25, hit: true,  damage: 15, damageType: 'fire',      description: 'Lyra lets loose a Scorching Ray — Goblin Boss takes 15 fire damage!' },
      { round: 3, turn: 1, actorId: 'Aldric',    action: 'attack',  targetId: 'Goblin Boss',  roll: 20, modifier: 5, total: 25, hit: true,  damage: 14, damageType: 'slashing',  description: 'Critical hit! Aldric cleaves through Goblin Boss for 14 slashing damage!' },
      { round: 4, turn: 0, actorId: 'Lyra',       action: 'spell',   targetId: 'Goblin Boss',  roll: 12, modifier: 6, total: 18, hit: true,  damage: 8,  damageType: 'fire',      description: 'Lyra finishes off the Goblin Boss — the cave falls silent.' },
    ],
    positionSnapshots: [
      { round: 1, positions: [
        { id: 'Aldric', type: 'character', q: 2, r: 1, color: '#4fc3f7', label: 'A' },
        { id: 'Lyra',   type: 'character', q: 1, r: 2, color: '#81c784', label: 'L' },
        { id: 'Goblin Scout', type: 'creature', q: 6, r: 2, color: '#e57373', label: 'G' },
        { id: 'Goblin Boss',  type: 'creature', q: 8, r: 3, color: '#c62828', label: 'B' },
      ]},
      { round: 2, positions: [
        { id: 'Aldric', type: 'character', q: 4, r: 1, color: '#4fc3f7', label: 'A' },
        { id: 'Lyra',   type: 'character', q: 2, r: 2, color: '#81c784', label: 'L' },
        { id: 'Goblin Boss',  type: 'creature', q: 7, r: 3, color: '#c62828', label: 'B' },
      ]},
      { round: 3, positions: [
        { id: 'Aldric', type: 'character', q: 5, r: 2, color: '#4fc3f7', label: 'A' },
        { id: 'Lyra',   type: 'character', q: 4, r: 2, color: '#81c784', label: 'L' },
        { id: 'Goblin Boss',  type: 'creature', q: 6, r: 3, color: '#c62828', label: 'B' },
      ]},
      { round: 4, positions: [
        { id: 'Aldric', type: 'character', q: 5, r: 2, color: '#4fc3f7', label: 'A' },
        { id: 'Lyra',   type: 'character', q: 5, r: 3, color: '#81c784', label: 'L' },
      ]},
    ],
  },
  {
    id: 'sess-002',
    partyName: 'The Iron Circle',
    type: 'combat',
    status: 'completed',
    startedAt: '2024-03-14T20:00:00Z',
    endedAt:   '2024-03-14T20:45:00Z',
    durationSeconds: 2700,
    round: 3,
    combatLog: [
      { round: 1, turn: 0, actorId: 'Finn',   action: 'attack', targetId: 'Bandit',    roll: 17, modifier: 4, total: 21, hit: true,  damage: 7, damageType: 'piercing', description: 'Finn stabs the Bandit with his rapier for 7 piercing damage.' },
      { round: 1, turn: 1, actorId: 'Bandit', action: 'attack', targetId: 'Finn',      roll: 13, modifier: 3, total: 16, hit: true,  damage: 5, damageType: 'slashing', description: 'The Bandit retaliates, cutting Finn for 5 slashing damage.' },
      { round: 2, turn: 0, actorId: 'Finn',   action: 'attack', targetId: 'Bandit',    roll: 19, modifier: 4, total: 23, hit: true,  damage: 9, damageType: 'piercing', description: 'Finn drives home a deadly thrust — Bandit falls!' },
    ],
    positionSnapshots: [
      { round: 1, positions: [
        { id: 'Finn',   type: 'character', q: 3, r: 1, color: '#ffb74d', label: 'F' },
        { id: 'Bandit', type: 'creature',  q: 5, r: 2, color: '#e57373', label: 'X' },
      ]},
      { round: 2, positions: [
        { id: 'Finn',   type: 'character', q: 4, r: 2, color: '#ffb74d', label: 'F' },
      ]},
    ],
  },
]

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page:        { maxWidth: 1080, margin: '0 auto' },
  heading:     { color: '#e94560', marginTop: 0 },
  sub:         { color: '#a8b2d8', marginTop: 0, fontWeight: 400 },
  layout:      { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.25rem', alignItems: 'start' },
  panel:       { background: '#16213e', border: '1px solid #0f3460', borderRadius: 8, padding: '1rem' },
  panelTitle:  { color: '#e94560', margin: '0 0 0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' },
  sessItem:    (active) => ({
    padding: '0.6rem 0.75rem',
    borderRadius: 6,
    cursor: 'pointer',
    background: active ? '#0f3460' : 'transparent',
    border: active ? '1px solid #1a4a80' : '1px solid transparent',
    marginBottom: '0.4rem',
  }),
  sessName:    { color: '#e0e0e0', fontWeight: 600, fontSize: '0.9rem', margin: 0 },
  sessMeta:    { color: '#a8b2d8', fontSize: '0.75rem', margin: '0.2rem 0 0' },
  roundBadge:  (round, active) => ({
    display: 'inline-block',
    padding: '0.15rem 0.6rem',
    borderRadius: 4,
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginRight: '0.4rem',
    marginBottom: '0.35rem',
    background: active ? '#e94560' : '#0f3460',
    color: '#fff',
    border: active ? 'none' : '1px solid #1a4a80',
  }),
  logEntry:    (hit) => ({
    borderLeft: `3px solid ${hit ? '#4fc3f7' : '#e57373'}`,
    paddingLeft: '0.7rem',
    marginBottom: '0.5rem',
    fontSize: '0.87rem',
  }),
  logDesc:     { color: '#c0c8d8', margin: '0 0 0.2rem' },
  logMeta:     { color: '#6a8a7a', fontSize: '0.75rem', margin: 0 },
  dmgBadge:    (type) => {
    const colours = { slashing: '#ef9a9a', piercing: '#ffe082', fire: '#ff8a65', cold: '#80deea', lightning: '#b39ddb', poison: '#a5d6a7' }
    return { display: 'inline-block', background: colours[type] ?? '#607d8b', color: '#111', borderRadius: 3, padding: '0 0.35rem', fontSize: '0.72rem', fontWeight: 700, marginLeft: '0.35rem' }
  },
  controls:    { display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' },
  btn:         { background: '#0f3460', border: '1px solid #1a4a80', borderRadius: 5, padding: '0.35rem 0.9rem', color: '#e0e0e0', cursor: 'pointer', fontSize: '0.85rem' },
  btnActive:   { background: '#e94560', border: 'none', borderRadius: 5, padding: '0.35rem 0.9rem', color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 },
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}
function formatDate(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CombatLogPage() {
  const [sessions, setSessions]           = useState([])
  const [selectedSession, setSelected]   = useState(null)
  const [viewRound, setViewRound]         = useState(1)
  const [replayRunning, setReplayRunning] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setSessions(MOCK_SESSIONS)
      if (MOCK_SESSIONS.length > 0) {
        setSelected(MOCK_SESSIONS[0])
        setViewRound(1)
      }
    }, 200)
    return () => clearTimeout(t)
  }, [])

  // Replay: auto-advance rounds every 2 seconds
  useEffect(() => {
    if (!replayRunning || !selectedSession) return
    const maxRound = selectedSession.positionSnapshots.length
    if (viewRound >= maxRound) { setReplayRunning(false); return }
    const t = setTimeout(() => setViewRound(r => r + 1), 1800)
    return () => clearTimeout(t)
  }, [replayRunning, viewRound, selectedSession])

  const handleSelectSession = useCallback((sess) => {
    setSelected(sess)
    setViewRound(1)
    setReplayRunning(false)
  }, [])

  const currentSnapshot = selectedSession?.positionSnapshots.find(s => s.round === viewRound)
  const tokens = currentSnapshot?.positions ?? []
  const roundLogs = selectedSession?.combatLog.filter(e => e.round === viewRound) ?? []

  return (
    <div style={S.page}>
      <h2 style={S.heading}>⚔️ Combat Log</h2>
      <p style={S.sub}>Review and replay past encounters round by round.</p>

      <div style={S.layout}>
        {/* Session list */}
        <div style={S.panel}>
          <p style={S.panelTitle}>Encounters ({sessions.length})</p>
          {sessions.map(sess => (
            <div key={sess.id} style={S.sessItem(selectedSession?.id === sess.id)} onClick={() => handleSelectSession(sess)}>
              <p style={S.sessName}>{sess.partyName}</p>
              <p style={S.sessMeta}>{formatDate(sess.startedAt)}</p>
              <p style={S.sessMeta}>{sess.round} rounds · {formatDuration(sess.durationSeconds)}</p>
            </div>
          ))}
          {sessions.length === 0 && <p style={{ color: '#a8b2d8', fontSize: '0.85rem' }}>No encounters recorded yet.</p>}
        </div>

        {/* Detail panel */}
        {selectedSession ? (
          <div>
            <div style={S.panel}>
              <p style={S.panelTitle}>Position Replay — {selectedSession.partyName}</p>

              {/* Round selector */}
              <div style={{ marginBottom: '0.75rem' }}>
                {selectedSession.positionSnapshots.map(s => (
                  <span key={s.round} style={S.roundBadge(s.round, s.round === viewRound)} onClick={() => { setViewRound(s.round); setReplayRunning(false) }}>
                    Round {s.round}
                  </span>
                ))}
              </div>

              {/* Playback controls */}
              <div style={S.controls}>
                <button style={viewRound === 1 ? S.btn : S.btn} onClick={() => { setViewRound(1); setReplayRunning(false) }}>⏮ Start</button>
                <button style={S.btn} onClick={() => setViewRound(r => Math.max(1, r - 1))}>◀ Prev</button>
                <button style={replayRunning ? S.btnActive : S.btn} onClick={() => setReplayRunning(r => !r)}>
                  {replayRunning ? '⏸ Pause' : '▶ Play'}
                </button>
                <button style={S.btn} onClick={() => setViewRound(r => Math.min(selectedSession.positionSnapshots.length, r + 1))}>▶ Next</button>
                <span style={{ color: '#a8b2d8', fontSize: '0.85rem' }}>Round {viewRound} of {selectedSession.positionSnapshots.length}</span>
              </div>

              <HexMap width={680} height={340} hexSize={40} tokens={tokens} showCoords={false} />
            </div>

            {/* Round combat log */}
            <div style={{ ...S.panel, marginTop: '1rem' }}>
              <p style={S.panelTitle}>Round {viewRound} Events</p>
              {roundLogs.length === 0 && <p style={{ color: '#a8b2d8', fontSize: '0.85rem' }}>No events this round.</p>}
              {roundLogs.map((entry, i) => (
                <div key={i} style={S.logEntry(entry.hit)}>
                  <p style={S.logDesc}>
                    {entry.description}
                    {entry.damage > 0 && <span style={S.dmgBadge(entry.damageType)}>{entry.damage} {entry.damageType}</span>}
                  </p>
                  <p style={S.logMeta}>
                    {entry.actorId} → {entry.action}
                    {entry.targetId ? ` on ${entry.targetId}` : ''}
                    {' · '}roll: {entry.roll} {entry.modifier >= 0 ? '+' : ''}{entry.modifier} = <strong style={{ color: '#e0e0e0' }}>{entry.total}</strong>
                    {' · '}{entry.hit ? '✅ Hit' : '❌ Miss'}
                  </p>
                </div>
              ))}
            </div>

            {/* Full combat log */}
            <div style={{ ...S.panel, marginTop: '1rem' }}>
              <p style={S.panelTitle}>Full Encounter Log</p>
              {selectedSession.combatLog.map((entry, i) => (
                <div key={i} style={S.logEntry(entry.hit)}>
                  <p style={S.logDesc}>
                    <span style={{ color: '#a8b2d8', marginRight: '0.5rem', fontSize: '0.75rem' }}>R{entry.round}T{entry.turn + 1}</span>
                    {entry.description}
                    {entry.damage > 0 && <span style={S.dmgBadge(entry.damageType)}>{entry.damage} {entry.damageType}</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ ...S.panel, textAlign: 'center', padding: '3rem 1rem', color: '#a8b2d8' }}>
            <div style={{ fontSize: '3rem' }}>⚔️</div>
            <p>Select an encounter to view the log.</p>
          </div>
        )}
      </div>
    </div>
  )
}
