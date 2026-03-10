import { useState, useEffect } from 'react'

interface Party {
  id: string
  name: string
  leaderId: string
  memberCount: number
  maxSize: number
  status: 'open' | 'full' | 'in_session' | 'completed' | 'disbanded'
  adventureModule: string
}

// ── Styles ──────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page:        { maxWidth: 900, margin: '0 auto' },
  heading:     { color: '#e94560', marginTop: 0 },
  subheading:  { color: '#a8b2d8', marginTop: 0, fontWeight: 400 },
  toolbar:     { display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' },
  input:       {
    flex: 1,
    minWidth: 220,
    background: '#0f3460',
    border: '1px solid #1a4a80',
    borderRadius: 6,
    padding: '0.5rem 0.75rem',
    color: '#e0e0e0',
    fontSize: '0.95rem',
  },
  btnPrimary:  {
    background: '#e94560',
    border: 'none',
    borderRadius: 6,
    padding: '0.5rem 1.25rem',
    color: '#fff',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  btnSecondary: {
    background: '#0f3460',
    border: '1px solid #1a4a80',
    borderRadius: 6,
    padding: '0.5rem 1.25rem',
    color: '#e0e0e0',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1rem' },
  card:        {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: 8,
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  cardTitle:   { color: '#e0e0e0', fontWeight: 600, margin: 0, fontSize: '1.05rem' },
  badge:       {
    display: 'inline-block',
    borderRadius: 4,
    padding: '0.15rem 0.5rem',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  meta:        { color: '#a8b2d8', fontSize: '0.85rem', margin: 0 },
  cardFooter:  { marginTop: 'auto', display: 'flex', gap: '0.5rem', paddingTop: '0.5rem' },
  modal:       {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 100,
  },
  modalBox:    {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: 10,
    padding: '1.5rem',
    width: '100%',
    maxWidth: 420,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  modalTitle:  { color: '#e94560', margin: 0, fontSize: '1.2rem' },
  label:       { color: '#a8b2d8', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  select:      {
    background: '#0f3460',
    border: '1px solid #1a4a80',
    borderRadius: 6,
    padding: '0.5rem 0.75rem',
    color: '#e0e0e0',
    fontSize: '0.9rem',
  },
  error:       { color: '#e57373', fontSize: '0.85rem' },
}

function statusBadge(status: Party['status']): React.CSSProperties {
  const colours: Record<string, string> = {
    open:       '#1b5e20',
    full:       '#e65100',
    in_session: '#1a237e',
    completed:  '#37474f',
    disbanded:  '#4a1010',
  }
  return { ...S.badge, background: colours[status] ?? '#37474f', color: '#fff' }
}

// ── Mock data (replaced by API in real usage) ─────────────────────────────────
const MOCK_PARTIES: Party[] = [
  { id: 'p1', name: 'The Iron Circle',     leaderId: 'u1', memberCount: 3, maxSize: 6, status: 'open',       adventureModule: 'Lost Mine of Phandelver' },
  { id: 'p2', name: 'Shadowhands',         leaderId: 'u2', memberCount: 4, maxSize: 4, status: 'full',       adventureModule: 'Curse of Strahd' },
  { id: 'p3', name: 'Ember & Ash',         leaderId: 'u3', memberCount: 5, maxSize: 6, status: 'in_session', adventureModule: 'Waterdeep: Dragon Heist' },
  { id: 'p4', name: 'Wandering Blades',    leaderId: 'u4', memberCount: 2, maxSize: 5, status: 'open',       adventureModule: 'Icewind Dale' },
]

const MODULES = [
  'Lost Mine of Phandelver',
  'Curse of Strahd',
  'Waterdeep: Dragon Heist',
  'Icewind Dale: Rime of the Frostmaiden',
  'Tomb of Annihilation',
  'Custom Adventure',
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function LobbyPage() {
  const [parties, setParties]       = useState<Party[]>([])
  const [filter, setFilter]         = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName]       = useState('')
  const [newModule, setNewModule]   = useState(MODULES[0])
  const [newMaxSize, setNewMaxSize] = useState(6)
  const [formError, setFormError]   = useState('')
  const [joinedId, setJoinedId]     = useState<string | null>(null)

  // Simulate API fetch
  useEffect(() => {
    const timer = setTimeout(() => setParties(MOCK_PARTIES), 300)
    return () => clearTimeout(timer)
  }, [])

  const filtered = parties.filter(p =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.adventureModule.toLowerCase().includes(filter.toLowerCase()),
  )

  function handleCreateParty(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) { setFormError('Party name is required.'); return }
    const party: Party = {
      id: `p-${Date.now()}`,
      name: newName.trim(),
      leaderId: 'me',
      memberCount: 1,
      maxSize: newMaxSize,
      status: 'open',
      adventureModule: newModule,
    }
    setParties(prev => [party, ...prev])
    setJoinedId(party.id)
    setShowCreate(false)
    setNewName('')
    setFormError('')
  }

  function handleJoin(partyId: string) {
    setJoinedId(partyId)
  }

  return (
    <div style={S.page}>
      <h2 style={S.heading}>🏰 Party Lobby</h2>
      <p style={S.subheading}>Join an existing party or create a new one to start adventuring.</p>

      {joinedId && (
        <div style={{ background: '#1b3a1b', border: '1px solid #2e7d32', borderRadius: 6, padding: '0.6rem 1rem', marginBottom: '1rem', color: '#a5d6a7', fontSize: '0.9rem' }}>
          ✅ You have joined party <strong>{parties.find(p => p.id === joinedId)?.name ?? joinedId}</strong>. Waiting for the party leader to start the session…
        </div>
      )}

      <div style={S.toolbar}>
        <input
          style={S.input}
          placeholder="Search parties or adventures…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          aria-label="Search parties"
        />
        <button style={S.btnPrimary} onClick={() => setShowCreate(true)}>
          + Create Party
        </button>
      </div>

      {filtered.length === 0 && (
        <p style={{ color: '#a8b2d8' }}>No parties match your search.</p>
      )}

      <div style={S.grid}>
        {filtered.map(party => (
          <div key={party.id} style={S.card}>
            <p style={S.cardTitle}>{party.name}</p>
            <span style={statusBadge(party.status)}>{party.status.replace('_', ' ')}</span>
            <p style={S.meta}>📖 {party.adventureModule}</p>
            <p style={S.meta}>👥 {party.memberCount} / {party.maxSize} players</p>
            <div style={S.cardFooter}>
              {party.status === 'open' && party.id !== joinedId && (
                <button style={S.btnPrimary} onClick={() => handleJoin(party.id)}>
                  Join
                </button>
              )}
              {party.id === joinedId && (
                <button style={S.btnSecondary} disabled>Joined ✓</button>
              )}
              {party.status !== 'open' && party.id !== joinedId && (
                <button style={S.btnSecondary} disabled>
                  {party.status === 'full' ? 'Full' : 'In Session'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Party Modal */}
      {showCreate && (
        <div style={S.modal} onClick={() => setShowCreate(false)}>
          <div style={S.modalBox} onClick={e => e.stopPropagation()}>
            <h3 style={S.modalTitle}>Create New Party</h3>
            <form onSubmit={handleCreateParty} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={S.label}>
                Party Name
                <input
                  style={S.input}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="e.g. The Iron Circle"
                  autoFocus
                />
              </label>
              <label style={S.label}>
                Adventure Module
                <select style={S.select} value={newModule} onChange={e => setNewModule(e.target.value)}>
                  {MODULES.map(m => <option key={m}>{m}</option>)}
                </select>
              </label>
              <label style={S.label}>
                Max Party Size
                <select style={S.select} value={newMaxSize} onChange={e => setNewMaxSize(Number(e.target.value))}>
                  {[4, 5, 6].map(n => <option key={n} value={n}>{n} players</option>)}
                </select>
              </label>
              {formError && <p style={S.error}>{formError}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" style={S.btnSecondary} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" style={S.btnPrimary}>Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
