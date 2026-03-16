/**
 * WorldPage — Live world clock and NPC activity viewer.
 *
 * Shows the current game time, what every NPC in Millhaven is doing right now,
 * and controls to advance or pause the world engine.
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────┐
 *   │  Header: World Clock + Controls                   │
 *   ├──────────────────────────────────────────────────┤
 *   │  NPC Grid (cards: name, location, activity)  │ Log│
 *   └──────────────────────────────────────────────────┘
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import './WorldPage.css'

// ── API helpers ───────────────────────────────────────────────────────────────

const API = {
  status:  ()          => fetch('/api/world/status').then(r => r.json()),
  npcs:    ()          => fetch('/api/world/npcs').then(r => r.json()),
  tick:    ()          => fetch('/api/world/tick',    { method: 'POST' }).then(r => r.json()),
  start:   (ms)        => fetch('/api/world/start',   { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tickIntervalMs: ms }) }).then(r => r.json()),
  stop:    ()          => fetch('/api/world/stop',    { method: 'POST' }).then(r => r.json()),
  setTime: (hour, day) => fetch('/api/world/set-time',{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hour, day }) }).then(r => r.json()),
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TICK_SPEEDS = [
  { label: 'Very Fast (10s)', ms: 10_000 },
  { label: 'Fast (30s)',      ms: 30_000 },
  { label: 'Normal (5 min)', ms: 300_000 },
  { label: 'Slow (15 min)',  ms: 900_000 },
]

const ACTIVITY_ICONS = {
  sleeping:   '💤',
  eating:     '🍞',
  traveling:  '🚶',
  resting:    '😴',
  praying:    '🙏',
  training:   '⚔️',
  studying:   '📖',
  researching:'🔬',
  rituals:    '🕯️',
  default:    '⚙️',
}

function getActivityIcon(activity) {
  if (!activity) return ACTIVITY_ICONS.default
  const a = activity.toLowerCase()
  for (const [key, icon] of Object.entries(ACTIVITY_ICONS)) {
    if (a.includes(key)) return icon
  }
  return ACTIVITY_ICONS.default
}

const NPC_TYPE_STYLES = {
  friendly: { border: '#4ade80', badge: '#166534', label: 'Townsfolk' },
  neutral:  { border: '#94a3b8', badge: '#374151', label: 'Neutral'   },
  enemy:    { border: '#f87171', badge: '#7f1d1d', label: 'Adversary' },
}

function getMoodColor(moodHint) {
  if (!moodHint) return '#94a3b8'
  const m = moodHint.toLowerCase()
  if (m.includes('content') || m.includes('peaceful') || m.includes('happy'))  return '#4ade80'
  if (m.includes('exhausted') || m.includes('groggy') || m.includes('burdened')) return '#94a3b8'
  if (m.includes('alert') || m.includes('guard') || m.includes('tense'))       return '#facc15'
  if (m.includes('hostile') || m.includes('aggressive') || m.includes('angry')) return '#f87171'
  if (m.includes('melancholy') || m.includes('sad') || m.includes('grief'))    return '#a78bfa'
  if (m.includes('smug') || m.includes('proud'))                               return '#d4a84b'
  return '#94a3b8'
}

// ── Time of Day background gradient ─────────────────────────────────────────

function getTimeGradient(timeOfDay) {
  const gradients = {
    dawn:      'linear-gradient(135deg, #1a0a2e 0%, #2d1b4e 30%, #6b3a2e 100%)',
    morning:   'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #1a2744 100%)',
    midday:    'linear-gradient(135deg, #0f1a2e 0%, #1a2744 50%, #0f2030 100%)',
    afternoon: 'linear-gradient(135deg, #0f1020 0%, #1a1a2e 100%)',
    dusk:      'linear-gradient(135deg, #1a0a18 0%, #2d1b1b 30%, #3d2010 100%)',
    evening:   'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 100%)',
    night:     'linear-gradient(135deg, #050510 0%, #0a0a1a 100%)',
  }
  return gradients[timeOfDay] || gradients.night
}

// ── NPC Card ──────────────────────────────────────────────────────────────────

function NpcCard({ state }) {
  const style  = NPC_TYPE_STYLES[state.npcType] || NPC_TYPE_STYLES.neutral
  const icon   = getActivityIcon(state.activity)
  const moodColor = getMoodColor(state.moodHint)

  return (
    <div className="world-npc-card" style={{ borderColor: style.border + '55' }}>
      <div className="world-npc-header">
        <span className="world-npc-name">{state.name}</span>
        <span className="world-npc-badge" style={{ background: style.badge }}>
          {style.label}
        </span>
      </div>

      <div className="world-npc-activity">
        <span className="world-npc-icon">{icon}</span>
        <span className="world-npc-action">{state.activity}</span>
      </div>

      <div className="world-npc-location">
        📍 {state.location}
      </div>

      {state.moodHint && (
        <div className="world-npc-mood" style={{ color: moodColor }}>
          ● {state.moodHint}
        </div>
      )}
    </div>
  )
}

// ── World Clock ───────────────────────────────────────────────────────────────

function WorldClock({ time }) {
  if (!time) return null

  const hour = time.hour ?? 0
  // Clock face: angle per hour (0-23), normalize to 12-hour
  const h12 = hour % 12
  const hourAngle   = (h12 / 12) * 360 + 90
  const minuteAngle = 0  // We only track hours

  return (
    <div className="world-clock">
      <svg viewBox="0 0 80 80" width="80" height="80" aria-label={`Clock showing ${time.formattedTime}`}>
        {/* Clock face */}
        <circle cx="40" cy="40" r="38" fill="#0a0a1a" stroke="#d4a84b" strokeWidth="2" />
        {/* Hour marks */}
        {[0,1,2,3,4,5,6,7,8,9,10,11].map(i => {
          const a = (i / 12) * 2 * Math.PI - Math.PI / 2
          const x1 = 40 + 30 * Math.cos(a)
          const y1 = 40 + 30 * Math.sin(a)
          const x2 = 40 + 35 * Math.cos(a)
          const y2 = 40 + 35 * Math.sin(a)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#d4a84b88" strokeWidth="1.5" />
        })}
        {/* AM/PM indicator arc */}
        <circle cx="40" cy="40" r="28" fill="none"
          stroke={hour < 12 ? '#4a9eff33' : '#d4a84b33'}
          strokeWidth="10"
        />
        {/* Hour hand */}
        {(() => {
          const a = (hourAngle * Math.PI) / 180
          return <line
            x1="40" y1="40"
            x2={40 + 20 * Math.cos(a)}
            y2={40 + 20 * Math.sin(a)}
            stroke="#d4a84b" strokeWidth="3" strokeLinecap="round"
          />
        })()}
        {/* Center dot */}
        <circle cx="40" cy="40" r="3" fill="#d4a84b" />
      </svg>
    </div>
  )
}

// ── Event Log ─────────────────────────────────────────────────────────────────

function EventLog({ events }) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [events])

  return (
    <div className="world-event-log" ref={ref}>
      <div className="world-log-title">World Events</div>
      {events.length === 0 && (
        <div className="world-log-empty">No events yet. Tick the world to begin.</div>
      )}
      {events.map(ev => (
        <div key={ev.id} className="world-log-entry">
          <span className="world-log-time">{ev.time?.formattedTime}</span>
          <span className="world-log-msg">{ev.message}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main WorldPage ────────────────────────────────────────────────────────────

export default function WorldPage() {
  const [status,      setStatus]      = useState(null)
  const [npcStates,   setNpcStates]   = useState({})
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [tickSpeed,   setTickSpeed]   = useState(TICK_SPEEDS[0].ms)
  const [filter,      setFilter]      = useState('all')   // 'all' | 'friendly' | 'enemy'
  const [searchQuery, setSearchQuery] = useState('')

  const pollRef = useRef(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const refresh = useCallback(async () => {
    try {
      const [st, npcs] = await Promise.all([API.status(), API.npcs()])
      setStatus(st)
      setNpcStates(npcs)
      setError(null)
    } catch (e) {
      setError('Could not reach the world engine. Is the server running?')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    pollRef.current = setInterval(refresh, 5000)
    return () => clearInterval(pollRef.current)
  }, [refresh])

  // ── Controls ───────────────────────────────────────────────────────────────

  const handleTick = async () => {
    await API.tick()
    await refresh()
  }

  const handleStartStop = async () => {
    if (status?.running) {
      await API.stop()
    } else {
      await API.start(tickSpeed)
    }
    await refresh()
  }

  const handleSetHour = async (e) => {
    const h = parseInt(e.target.value, 10)
    if (!isNaN(h)) {
      await API.setTime(h, undefined)
      await refresh()
    }
  }

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filteredNpcs = Object.values(npcStates).filter(state => {
    if (!state) return false
    if (filter !== 'all' && state.npcType !== filter) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        state.name?.toLowerCase().includes(q) ||
        state.location?.toLowerCase().includes(q) ||
        state.activity?.toLowerCase().includes(q)
      )
    }
    return true
  })

  const friendlyCount = Object.values(npcStates).filter(s => s?.npcType === 'friendly').length
  const enemyCount    = Object.values(npcStates).filter(s => s?.npcType === 'enemy').length

  // ── Render ─────────────────────────────────────────────────────────────────

  const timeOfDay = status?.time?.timeOfDay || 'night'
  const bgGradient = getTimeGradient(timeOfDay)

  if (loading) {
    return (
      <div className="world-page" style={{ background: bgGradient }}>
        <div className="world-loading">Loading world engine…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="world-page" style={{ background: bgGradient }}>
        <div className="world-error">{error}</div>
      </div>
    )
  }

  return (
    <div className="world-page" style={{ background: bgGradient }}>

      {/* ── Header ── */}
      <header className="world-header">
        <div className="world-header-left">
          <WorldClock time={status?.time} />
          <div className="world-time-info">
            <div className="world-time-main">{status?.time?.formattedTime}</div>
            <div className="world-time-sub">
              {status?.time?.timeOfDay} · {status?.time?.dayName} · Day {status?.time?.day}
            </div>
            <div className="world-time-season">
              {status?.time?.season} · Season Day {status?.time?.seasonDay}
            </div>
          </div>
        </div>

        <div className="world-header-center">
          <h2 className="world-title">The World Engine</h2>
          <div className="world-npc-counts">
            {status?.npcCount} characters · {friendlyCount} townsfolk · {enemyCount} adversaries
          </div>
        </div>

        <div className="world-header-right">
          <div className="world-controls">
            {/* Hour slider */}
            <div className="world-control-group">
              <label className="world-control-label">Hour: {status?.time?.hour}:00</label>
              <input
                type="range" min="0" max="23"
                value={status?.time?.hour ?? 8}
                onChange={handleSetHour}
                className="world-hour-slider"
                aria-label="Set world hour"
              />
            </div>

            {/* Speed selector */}
            <div className="world-control-group">
              <label className="world-control-label">Speed</label>
              <select
                value={tickSpeed}
                onChange={e => setTickSpeed(Number(e.target.value))}
                className="world-speed-select"
                disabled={status?.running}
                aria-label="Select tick speed"
              >
                {TICK_SPEEDS.map(s => (
                  <option key={s.ms} value={s.ms}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Buttons */}
            <div className="world-btn-row">
              <button
                className={`world-btn ${status?.running ? 'world-btn-stop' : 'world-btn-start'}`}
                onClick={handleStartStop}
                aria-label={status?.running ? 'Pause world' : 'Start world'}
              >
                {status?.running ? '⏸ Pause' : '▶ Start'}
              </button>
              <button
                className="world-btn world-btn-tick"
                onClick={handleTick}
                aria-label="Advance one hour"
              >
                ⏭ +1 Hour
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="world-body">

        {/* ── Filter Bar ── */}
        <div className="world-filter-bar">
          <div className="world-filter-tabs">
            {['all', 'friendly', 'neutral', 'enemy'].map(f => (
              <button
                key={f}
                className={`world-filter-tab ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? `All (${Object.values(npcStates).filter(Boolean).length})`
                  : f === 'friendly' ? `Townsfolk (${friendlyCount})`
                  : f === 'enemy'    ? `Adversaries (${enemyCount})`
                  : 'Neutral'}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by name, place, or activity…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="world-search"
            aria-label="Search NPCs"
          />
        </div>

        {/* ── Main area: NPC grid + log ── */}
        <div className="world-main">
          <div className="world-npc-grid">
            {filteredNpcs.length === 0 && (
              <div className="world-empty">No characters match your filter.</div>
            )}
            {filteredNpcs.map(state => (
              <NpcCard key={state.templateKey} state={state} />
            ))}
          </div>

          <EventLog events={status?.recentEvents ?? []} />
        </div>
      </div>
    </div>
  )
}
