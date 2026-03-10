import { useState } from 'react'

// ── D&D 5e reference data ─────────────────────────────────────────────────────
const RACES = ['Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Half-Elf', 'Half-Orc', 'Halfling', 'Human', 'Tiefling']
const CLASSES = ['Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk', 'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard']
const BACKGROUNDS = ['Acolyte', 'Criminal', 'Folk Hero', 'Guild Artisan', 'Noble', 'Outlander', 'Sage', 'Sailor', 'Soldier', 'Urchin']
const ALIGNMENTS = ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'True Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil']
const ABILITY_NAMES = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as const
type AbilityName = typeof ABILITY_NAMES[number]

interface AbilityScores { [K in AbilityName]: number }
interface Character {
  id: string
  name: string
  race: string
  charClass: string
  background: string
  alignment: string
  level: number
  abilityScores: AbilityScores
  hp: number
  maxHp: number
  ac: number
  notes: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function abilityMod(score: number) {
  return Math.floor((score - 10) / 2)
}
function modStr(score: number) {
  const m = abilityMod(score)
  return m >= 0 ? `+${m}` : `${m}`
}
function profBonus(level: number) {
  return Math.ceil(level / 4) + 1
}

// ── Styles ────────────────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  page:       { maxWidth: 960, margin: '0 auto' },
  heading:    { color: '#e94560', marginTop: 0 },
  sub:        { color: '#a8b2d8', marginTop: 0, fontWeight: 400 },
  twoCol:     { display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.5rem', alignItems: 'start' },
  panel:      { background: '#16213e', border: '1px solid #0f3460', borderRadius: 8, padding: '1.25rem' },
  panelTitle: { color: '#e94560', margin: '0 0 1rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' },
  label:      { display: 'flex', flexDirection: 'column', gap: '0.25rem', color: '#a8b2d8', fontSize: '0.85rem', marginBottom: '0.75rem' },
  input:      { background: '#0f3460', border: '1px solid #1a4a80', borderRadius: 5, padding: '0.45rem 0.7rem', color: '#e0e0e0', fontSize: '0.9rem' },
  select:     { background: '#0f3460', border: '1px solid #1a4a80', borderRadius: 5, padding: '0.45rem 0.7rem', color: '#e0e0e0', fontSize: '0.9rem' },
  btnPrimary: { background: '#e94560', border: 'none', borderRadius: 6, padding: '0.55rem 1.25rem', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' },
  btnSm:      { background: '#0f3460', border: '1px solid #1a4a80', borderRadius: 4, padding: '0.2rem 0.6rem', color: '#a8b2d8', cursor: 'pointer', fontSize: '0.8rem' },
  abilityGrid:{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' },
  abilityBox: { background: '#0d1b2a', border: '1px solid #0f3460', borderRadius: 6, padding: '0.5rem', textAlign: 'center' },
  abilityName:{ color: '#a8b2d8', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' },
  abilityVal: { color: '#fff', fontSize: '1.3rem', fontWeight: 700, margin: '0.2rem 0 0.1rem' },
  abilityMod: { color: '#6af0a8', fontSize: '0.85rem', fontWeight: 600 },
  statRow:    { display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid #0f3460', fontSize: '0.88rem' },
  statLabel:  { color: '#a8b2d8' },
  statVal:    { color: '#e0e0e0', fontWeight: 600 },
  charList:   { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' },
  charItem:   { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d1b2a', borderRadius: 6, padding: '0.5rem 0.75rem', fontSize: '0.88rem' },
  charName:   { color: '#e0e0e0', fontWeight: 600 },
  charMeta:   { color: '#a8b2d8', fontSize: '0.78rem' },
}

// ── Empty form state ──────────────────────────────────────────────────────────
function emptyScores(): AbilityScores {
  return { strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10 }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CharacterPage() {
  const [characters, setCharacters] = useState<Character[]>([])
  const [viewing, setViewing]       = useState<Character | null>(null)
  const [form, setForm]             = useState({
    name: '', race: RACES[0], charClass: CLASSES[0],
    background: BACKGROUNDS[0], alignment: ALIGNMENTS[0],
    level: 1, abilityScores: emptyScores(), notes: '',
  })

  function updateForm(key: string, value: unknown) {
    setForm(prev => ({ ...prev, [key]: value }))
  }
  function updateAbility(ability: AbilityName, value: number) {
    setForm(prev => ({
      ...prev,
      abilityScores: { ...prev.abilityScores, [ability]: Math.min(20, Math.max(1, value)) },
    }))
  }

  // Roll 4d6 drop lowest for an ability score
  function rollAbility() {
    const rolls = Array.from({ length: 4 }, () => Math.ceil(Math.random() * 6))
    rolls.sort((a, b) => a - b)
    return rolls.slice(1).reduce((a, b) => a + b, 0)
  }
  function rollAllAbilities() {
    const scores = {} as AbilityScores
    for (const ab of ABILITY_NAMES) scores[ab] = rollAbility()
    setForm(prev => ({ ...prev, abilityScores: scores }))
  }

  function deriveHp(charClass: string, conMod: number, level: number) {
    const hitDice: Record<string, number> = {
      Barbarian: 12, Fighter: 10, Paladin: 10, Ranger: 10,
      Bard: 8, Cleric: 8, Druid: 8, Monk: 8, Rogue: 8, Warlock: 8,
      Sorcerer: 6, Wizard: 6,
    }
    const hd = hitDice[charClass] ?? 8
    const base = hd + conMod
    const extra = (level - 1) * (Math.floor(hd / 2) + 1 + conMod)
    return Math.max(1, base + extra)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const conMod = abilityMod(form.abilityScores.constitution)
    const maxHp  = deriveHp(form.charClass, conMod, form.level)
    const newChar: Character = {
      id:           `char-${Date.now()}`,
      name:         form.name.trim() || 'Unnamed Hero',
      race:         form.race,
      charClass:    form.charClass,
      background:   form.background,
      alignment:    form.alignment,
      level:        form.level,
      abilityScores: { ...form.abilityScores },
      hp:           maxHp,
      maxHp,
      ac:           10 + abilityMod(form.abilityScores.dexterity),
      notes:        form.notes,
    }
    setCharacters(prev => [newChar, ...prev])
    setViewing(newChar)
    setForm({ name: '', race: RACES[0], charClass: CLASSES[0], background: BACKGROUNDS[0], alignment: ALIGNMENTS[0], level: 1, abilityScores: emptyScores(), notes: '' })
  }

  return (
    <div style={S.page}>
      <h2 style={S.heading}>🧙 Characters</h2>
      <p style={S.sub}>Create and manage your D&amp;D 5e characters.</p>

      <div style={S.twoCol}>
        {/* Creation form */}
        <div>
          <div style={S.panel}>
            <p style={S.panelTitle}>New Character</p>
            <form onSubmit={handleCreate}>
              <label style={S.label}>Name<input style={S.input} value={form.name} onChange={e => updateForm('name', e.target.value)} placeholder="e.g. Aldric Ironforge" /></label>
              <label style={S.label}>Race
                <select style={S.select} value={form.race} onChange={e => updateForm('race', e.target.value)}>
                  {RACES.map(r => <option key={r}>{r}</option>)}
                </select>
              </label>
              <label style={S.label}>Class
                <select style={S.select} value={form.charClass} onChange={e => updateForm('charClass', e.target.value)}>
                  {CLASSES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label style={S.label}>Background
                <select style={S.select} value={form.background} onChange={e => updateForm('background', e.target.value)}>
                  {BACKGROUNDS.map(b => <option key={b}>{b}</option>)}
                </select>
              </label>
              <label style={S.label}>Alignment
                <select style={S.select} value={form.alignment} onChange={e => updateForm('alignment', e.target.value)}>
                  {ALIGNMENTS.map(a => <option key={a}>{a}</option>)}
                </select>
              </label>
              <label style={S.label}>Level
                <input style={S.input} type="number" min={1} max={20} value={form.level} onChange={e => updateForm('level', Number(e.target.value))} />
              </label>

              {/* Ability Scores */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ color: '#a8b2d8', fontSize: '0.85rem' }}>Ability Scores</span>
                <button type="button" style={S.btnSm} onClick={rollAllAbilities}>🎲 Roll All</button>
              </div>
              <div style={S.abilityGrid}>
                {ABILITY_NAMES.map(ab => (
                  <div key={ab} style={S.abilityBox}>
                    <div style={S.abilityName}>{ab.slice(0, 3).toUpperCase()}</div>
                    <input
                      style={{ ...S.input, width: '100%', textAlign: 'center', padding: '0.25rem', fontSize: '1rem', fontWeight: 700 }}
                      type="number" min={1} max={20}
                      value={form.abilityScores[ab]}
                      onChange={e => updateAbility(ab, Number(e.target.value))}
                    />
                    <div style={S.abilityMod}>{modStr(form.abilityScores[ab])}</div>
                  </div>
                ))}
              </div>

              <label style={{ ...S.label, marginTop: '0.75rem' }}>Notes
                <textarea style={{ ...S.input, resize: 'vertical', minHeight: 60 }} value={form.notes} onChange={e => updateForm('notes', e.target.value)} placeholder="Backstory, traits…" />
              </label>

              <button type="submit" style={{ ...S.btnPrimary, width: '100%', marginTop: '0.25rem' }}>
                Create Character
              </button>
            </form>
          </div>

          {/* Character list */}
          {characters.length > 0 && (
            <div style={{ ...S.panel, marginTop: '1rem' }}>
              <p style={S.panelTitle}>My Characters ({characters.length})</p>
              <div style={S.charList}>
                {characters.map(c => (
                  <div key={c.id} style={S.charItem}>
                    <div>
                      <div style={S.charName}>{c.name}</div>
                      <div style={S.charMeta}>Lv{c.level} {c.race} {c.charClass}</div>
                    </div>
                    <button style={S.btnSm} onClick={() => setViewing(c)}>View Sheet</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Character sheet viewer */}
        {viewing ? (
          <div style={S.panel}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, color: '#e94560', fontSize: '1.4rem' }}>{viewing.name}</h3>
                <p style={{ margin: '0.25rem 0 0', color: '#a8b2d8', fontSize: '0.9rem' }}>
                  Level {viewing.level} {viewing.race} {viewing.charClass} · {viewing.background} · {viewing.alignment}
                </p>
              </div>
              <button style={S.btnSm} onClick={() => setViewing(null)}>✕ Close</button>
            </div>

            {/* Core stats */}
            <p style={{ ...S.panelTitle, margin: '0 0 0.6rem' }}>Core Stats</p>
            <div style={S.abilityGrid}>
              {ABILITY_NAMES.map(ab => (
                <div key={ab} style={S.abilityBox}>
                  <div style={S.abilityName}>{ab.slice(0, 3).toUpperCase()}</div>
                  <div style={S.abilityVal}>{viewing.abilityScores[ab]}</div>
                  <div style={S.abilityMod}>{modStr(viewing.abilityScores[ab])}</div>
                </div>
              ))}
            </div>

            {/* Derived stats */}
            <p style={{ ...S.panelTitle, margin: '1rem 0 0.6rem' }}>Combat Stats</p>
            {[
              ['Hit Points', `${viewing.hp} / ${viewing.maxHp}`],
              ['Armor Class', viewing.ac],
              ['Proficiency Bonus', `+${profBonus(viewing.level)}`],
              ['Initiative', modStr(viewing.abilityScores.dexterity)],
              ['Speed', '30 ft'],
              ['Passive Perception', 10 + abilityMod(viewing.abilityScores.wisdom)],
            ].map(([label, val]) => (
              <div key={String(label)} style={S.statRow}>
                <span style={S.statLabel}>{label}</span>
                <span style={S.statVal}>{val}</span>
              </div>
            ))}

            {viewing.notes && (
              <>
                <p style={{ ...S.panelTitle, margin: '1rem 0 0.6rem' }}>Notes</p>
                <p style={{ color: '#c0c8d8', fontSize: '0.88rem', lineHeight: 1.5, margin: 0 }}>{viewing.notes}</p>
              </>
            )}
          </div>
        ) : (
          <div style={{ ...S.panel, color: '#a8b2d8', textAlign: 'center', padding: '3rem 1rem' }}>
            <div style={{ fontSize: '3rem' }}>🧙</div>
            <p>Create a character to see their sheet here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
