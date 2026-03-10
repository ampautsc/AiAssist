import { useState, useEffect } from 'react'
import { api } from '../api'

export default function CharacterSheet() {
  const [levels, setLevels] = useState([]);
  const [features, setFeatures] = useState([]);
  const [skills, setSkills] = useState([]);
  const [backgrounds, setBackgrounds] = useState([]);
  const [conditions, setConditions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('progression');
  const [showLevel, setShowLevel] = useState(8);

  useEffect(() => {
    Promise.all([
      api.getLevels(),
      api.getClassFeatures({ level: 20 }),
      api.getSkills(),
      api.getBackgrounds(),
      api.getConditions(),
    ]).then(([lv, ft, sk, bg, co]) => {
      setLevels(lv);
      setFeatures(ft);
      setSkills(sk);
      setBackgrounds(bg);
      setConditions(co);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return <div className="loading">Loading character data...</div>;

  const currentLevel = levels.find(l => l.level === showLevel);
  const tabs = [
    { id: 'progression', label: '📊 Level Progression' },
    { id: 'features', label: '⚔️ Class Features' },
    { id: 'skills', label: '🎯 Skills & Expertise' },
    { id: 'backgrounds', label: '📖 Backgrounds' },
    { id: 'conditions', label: '💀 Conditions' },
  ];

  return (
    <div className="page">
      <h2 className="page-title">📋 Lore Bard Reference</h2>
      <p className="page-subtitle">Everything you need to run a College of Lore Bard</p>

      {/* Tab bar */}
      <div className="cs-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`cs-tab ${activeTab === t.id ? 'cs-tab-active' : ''}`}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* PROGRESSION TAB */}
      {activeTab === 'progression' && (
        <div className="cs-section">
          <div className="cs-level-picker">
            <label>Show up to level:</label>
            <input type="range" min={1} max={20} value={showLevel} onChange={e => setShowLevel(Number(e.target.value))} />
            <span className="cs-level-value">Lv {showLevel}</span>
          </div>

          {/* Current level snapshot */}
          {currentLevel && (
            <div className="cs-snapshot">
              <h3>Level {showLevel} Snapshot</h3>
              <div className="cs-snapshot-grid">
                <div className="cs-snap-item">
                  <div className="cs-snap-value">+{currentLevel.proficiencyBonus}</div>
                  <div className="cs-snap-label">Prof Bonus</div>
                </div>
                <div className="cs-snap-item">
                  <div className="cs-snap-value">{currentLevel.cantripsKnown}</div>
                  <div className="cs-snap-label">Cantrips</div>
                </div>
                <div className="cs-snap-item">
                  <div className="cs-snap-value">{currentLevel.spellsKnown}</div>
                  <div className="cs-snap-label">Spells Known</div>
                </div>
                <div className="cs-snap-item">
                  <div className="cs-snap-value">{currentLevel.totalSpellSlots}</div>
                  <div className="cs-snap-label">Total Slots</div>
                </div>
                <div className="cs-snap-item">
                  <div className="cs-snap-value">{currentLevel.maxSpellLevel}</div>
                  <div className="cs-snap-label">Max Spell Lv</div>
                </div>
                <div className="cs-snap-item">
                  <div className="cs-snap-value">d{currentLevel.bardicInspirationDie}</div>
                  <div className="cs-snap-label">Inspiration</div>
                </div>
                {currentLevel.songOfRestDie > 0 && (
                  <div className="cs-snap-item">
                    <div className="cs-snap-value">d{currentLevel.songOfRestDie}</div>
                    <div className="cs-snap-label">Song of Rest</div>
                  </div>
                )}
                {currentLevel.magicalSecretsSlots > 0 && (
                  <div className="cs-snap-item">
                    <div className="cs-snap-value" style={{ color: 'var(--accent-purple)' }}>{currentLevel.magicalSecretsSlots}</div>
                    <div className="cs-snap-label">Magical Secrets</div>
                  </div>
                )}
              </div>

              {/* Spell slots breakdown */}
              <div className="cs-slots">
                <h4>Spell Slots</h4>
                <div className="cs-slots-row">
                  {[1,2,3,4,5,6,7,8,9].map(lv => {
                    const count = currentLevel.spellSlots?.[lv] || 0;
                    return (
                      <div key={lv} className={`cs-slot ${count > 0 ? 'cs-slot-active' : ''}`}>
                        <div className="cs-slot-level">{lv}</div>
                        <div className="cs-slot-count">{count > 0 ? '●'.repeat(count) : '—'}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Full progression table */}
          <div className="cs-table-wrap">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Lv</th>
                  <th>Prof</th>
                  <th>Cantrips</th>
                  <th>Spells</th>
                  <th>1st</th><th>2nd</th><th>3rd</th><th>4th</th><th>5th</th><th>6th</th><th>7th</th><th>8th</th><th>9th</th>
                  <th>Insp. Die</th>
                  <th>Features</th>
                </tr>
              </thead>
              <tbody>
                {levels.filter(l => l.level <= showLevel).map(l => (
                  <tr key={l.level} className={l.level === showLevel ? 'cs-current-level' : ''}>
                    <td style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>{l.level}</td>
                    <td>+{l.proficiencyBonus}</td>
                    <td>{l.cantripsKnown}</td>
                    <td>{l.spellsKnown}</td>
                    {[1,2,3,4,5,6,7,8,9].map(slotLv => (
                      <td key={slotLv} style={{ color: l.spellSlots?.[slotLv] > 0 ? 'var(--accent-blue)' : 'var(--text-muted)', fontWeight: l.spellSlots?.[slotLv] > 0 ? 600 : 400 }}>
                        {l.spellSlots?.[slotLv] || '—'}
                      </td>
                    ))}
                    <td>d{l.bardicInspirationDie}</td>
                    <td style={{ fontSize: '0.8rem' }}>{l.features?.join(', ') || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FEATURES TAB */}
      {activeTab === 'features' && (
        <div className="cs-section">
          <div className="cs-feature-groups">
            <h3>Bard Base Class</h3>
            {features.filter(f => !f.subclass).map(f => (
              <div key={f._id} className="ability-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <span className="ability-name">{f.name}</span>
                    <span className="ability-cost"> — Level {f.level}</span>
                  </span>
                  {f.actionCost && <span className="spell-tag">{f.actionCost}</span>}
                </div>
                <div className="ability-desc">{f.mechanicalSummary}</div>
                {f.scalingDescription && <div className="ability-notes">Scaling: {f.scalingDescription}</div>}
                {f.usesPerDay && <div className="ability-notes">Uses: {f.usesPerDay}</div>}
              </div>
            ))}

            <h3 style={{ marginTop: '2rem' }}>College of Lore</h3>
            {features.filter(f => f.subclass === 'College of Lore').map(f => (
              <div key={f._id} className="ability-card" style={{ borderLeft: '3px solid var(--accent-purple)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    <span className="ability-name">{f.name}</span>
                    <span className="ability-cost"> — Level {f.level}</span>
                  </span>
                  {f.actionCost && <span className="spell-tag">{f.actionCost}</span>}
                </div>
                <div className="ability-desc">{f.mechanicalSummary}</div>
                {f.scalingDescription && <div className="ability-notes">Scaling: {f.scalingDescription}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SKILLS TAB */}
      {activeTab === 'skills' && (
        <div className="cs-section">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Bards get 3 skill proficiencies + 3 from Lore = 6, plus background skills. Expertise in 2 at Lv3, 2 more at Lv10.
          </p>
          <div className="cs-skill-grid">
            {skills.map(s => (
              <div key={s._id} className={`cs-skill-card ${s.expertiseCandidate ? 'cs-skill-expertise' : ''}`}>
                <div className="cs-skill-header">
                  <span className="cs-skill-name">{s.name}</span>
                  <span className="cs-skill-ability">{s.ability}</span>
                </div>
                <div className="cs-skill-desc">{s.description}</div>
                <div className={`cs-skill-notes ${s.expertiseCandidate ? 'cs-expertise-notes' : ''}`}>
                  {s.expertiseCandidate && <span className="spell-ms-badge" style={{ marginRight: '0.5rem' }}>★ Expertise</span>}
                  {s.expertiseNotes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BACKGROUNDS TAB */}
      {activeTab === 'backgrounds' && (
        <div className="cs-section">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Backgrounds ranked by synergy with a social-focused Lore Bard.
          </p>
          <div className="card-grid">
            {backgrounds.map(bg => (
              <div key={bg._id} className="card" style={{ borderLeft: `3px solid ${bg.bardRating >= 8 ? 'var(--accent-gold)' : bg.bardRating >= 6 ? 'var(--accent-blue)' : 'var(--border)'}` }}>
                <div className="card-header">
                  <div>
                    <div className="card-title">{bg.name}</div>
                    <div className="card-subtitle">{bg.source}</div>
                  </div>
                  <span className="spell-rating-badge" style={{
                    background: bg.bardRating >= 8 ? 'rgba(212,168,75,0.2)' : 'rgba(74,158,255,0.15)',
                    color: bg.bardRating >= 8 ? 'var(--accent-gold)' : 'var(--accent-blue)',
                    borderColor: bg.bardRating >= 8 ? 'var(--accent-gold)' : 'var(--accent-blue)',
                  }}>
                    {bg.bardRating}/10
                  </span>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--accent-green)' }}>
                    Skills: {bg.skillProficiencies?.join(', ')}
                  </div>
                  {bg.toolProficiencies?.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Tools: {bg.toolProficiencies.join(', ')}</div>
                  )}
                  {bg.languages > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Languages: {bg.languages}</div>
                  )}
                </div>
                {bg.feature && (
                  <div className="detail-block" style={{ padding: '0.75rem' }}>
                    <div className="detail-block-label">{bg.feature.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{bg.feature.description}</div>
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--accent-gold)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                  {bg.bardSynergy}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONDITIONS TAB */}
      {activeTab === 'conditions' && (
        <div className="cs-section">
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Know your conditions — Bards inflict and cure many of these.
          </p>
          <div className="cs-condition-grid">
            {conditions.map(c => (
              <div key={c._id} className="ability-card">
                <div className="ability-name">{c.name}</div>
                <div className="ability-desc" style={{ fontWeight: 600 }}>{c.mechanicalSummary}</div>
                {c.description?.map((p, i) => <div key={i} className="ability-desc" style={{ marginTop: '0.25rem' }}>{p}</div>)}
                {c.removedBy?.length > 0 && (
                  <div className="ability-notes">
                    Removed by: {c.removedBy.join(', ')}
                  </div>
                )}
                <div className="tag-list">
                  {c.tags?.map(t => <span key={t} className="tag">{t}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
