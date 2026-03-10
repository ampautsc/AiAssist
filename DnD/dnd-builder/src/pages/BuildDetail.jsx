import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function BuildDetail() {
  const { id } = useParams();
  const [build, setBuild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBuildById(id)
      .then(b => { setBuild(b); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!build) return <div className="page">Build not found.</div>;

  const species = build.species;
  const concClass = build.concentrationHoldPct >= 95 ? 'conc-99' :
    build.concentrationHoldPct >= 75 ? 'conc-80' : 'conc-60';

  return (
    <div className="page">
      <Link to="/" className="back-btn">← Back to Builds</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <h2 className="page-title">{build.name}</h2>
        <span className={`tier-badge tier-${species?.tier}`}>Tier {species?.tier}</span>
        <span className={`archetype-badge archetype-${build.archetype}`}>{build.archetype}</span>
      </div>
      <p className="page-subtitle">
        {species?.name && <Link to={`/species/${species._id}`}>{species.name}</Link>}
        {species?.flavorText && ` — ${species.flavorText}`}
      </p>

      {/* Core Stats */}
      <div className="build-stats" style={{ maxWidth: '500px' }}>
        <div className="build-stat">
          <div className="build-stat-value">{build.finalAc}</div>
          <div className="build-stat-label">AC</div>
        </div>
        <div className="build-stat">
          <div className="build-stat-value" style={{ color: build.spellDc >= 17 ? 'var(--accent-gold)' : 'inherit' }}>
            {build.spellDc}
          </div>
          <div className="build-stat-label">Spell DC</div>
        </div>
        <div className="build-stat">
          <div className="build-stat-value">{build.finalCha}</div>
          <div className="build-stat-label">CHA</div>
        </div>
        <div className="build-stat">
          <div className={`build-stat-value conc-indicator ${concClass}`}>{build.concentrationHoldPct}%</div>
          <div className="build-stat-label">Conc Hold</div>
        </div>
      </div>

      {/* Philosophy */}
      <div className="detail-section">
        <h3>Build Philosophy</h3>
        <div className="detail-text">{build.philosophy}</div>
      </div>

      {/* Feat Progression */}
      <div className="detail-section">
        <h3>Feat Progression</h3>
        <div className="detail-block">
          <div className="detail-text">{build.featProgression}</div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem' }}>
          {build.feats?.map(f => (
            <div key={f._id} className="ability-card" style={{ flex: '1 1 280px' }}>
              <div className="ability-name">{f.name}</div>
              <div className="ability-desc">{f.description}</div>
              <div className="tag-list">
                {f.tags?.map((t, i) => <span key={i} className="tag">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="detail-section">
        <h3>Magic Items</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
          {build.items?.map(item => (
            <div key={item._id} className="ability-card" style={{ flex: '1 1 280px' }}>
              <div className="ability-name">{item.name}</div>
              <div className="ability-desc">{item.description}</div>
              <div className="tag-list">
                {item.acBonus > 0 && <span className="tag" style={{ borderColor: 'var(--accent-green)' }}>+{item.acBonus} AC</span>}
                {item.saveBonus > 0 && <span className="tag" style={{ borderColor: 'var(--accent-green)' }}>+{item.saveBonus} saves</span>}
                {item.requiresAttunement && <span className="tag">Attunement</span>}
                {item.tags?.map((t, i) => <span key={i} className="tag">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Combat Loop */}
      <div className="detail-section">
        <h3>Combat Loop</h3>
        <div className="detail-block">
          <div className="detail-text">{build.combatLoop}</div>
        </div>
      </div>

      {/* CON Protection */}
      <div className="detail-section">
        <h3>Concentration Protection</h3>
        <div className="detail-block">
          <div className="detail-block-label">Method</div>
          <div className="detail-text" style={{ textTransform: 'capitalize' }}>
            {build.conSaveType === 'both' ? 'Advantage + Proficiency (both!)' :
             build.conSaveType === 'advantage' ? 'Advantage (War Caster)' :
             build.conSaveType === 'proficiency' ? 'Proficiency (Resilient CON)' :
             'None — relies on positioning or prevention'}
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            CON Save Bonus: +{build.conSaveBonus} | Hold DC 10: <span className={`conc-indicator ${concClass}`}>{build.concentrationHoldPct}%</span>
          </div>
        </div>
      </div>

      {/* Ability Scores */}
      <div className="detail-section">
        <h3>Ability Scores</h3>
        <div className="build-stats" style={{ gridTemplateColumns: 'repeat(6, 1fr)', maxWidth: '500px' }}>
          {['str', 'dex', 'con', 'int', 'wis', 'cha'].map(stat => (
            <div key={stat} className="build-stat">
              <div className="build-stat-value" style={{ fontSize: '1.1rem' }}>{build.stats?.[stat]}</div>
              <div className="build-stat-label">{stat.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ratings */}
      <div className="detail-section">
        <h3>Ratings</h3>
        <div style={{ maxWidth: '400px' }}>
          {[
            { key: 'combat', label: 'Combat', color: 'var(--accent-red)' },
            { key: 'social', label: 'Social', color: 'var(--accent-blue)' },
            { key: 'fun', label: 'Fun', color: 'var(--accent-gold)' },
            { key: 'durability', label: 'Durability', color: 'var(--accent-green)' },
          ].map(r => (
            <div key={r.key} className="stat-row">
              <span className="stat-label" style={{ width: 70 }}>{r.label}</span>
              <span className="stat-value" style={{ color: r.color }}>{build.ratings?.[r.key]}</span>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{ width: `${(build.ratings?.[r.key] || 0) * 10}%`, background: r.color }} />
              </div>
            </div>
          ))}
          <div className="stat-row" style={{ marginTop: '0.5rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
            <span className="stat-label" style={{ width: 70, fontWeight: 700 }}>Overall</span>
            <span className="stat-value" style={{ fontWeight: 700 }}>{build.overallScore}</span>
          </div>
        </div>
      </div>

      {/* Risks & Rewards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="detail-section">
          <h3 style={{ color: 'var(--accent-red)' }}>⚠️ Risks</h3>
          <div className="detail-text">{build.risks}</div>
        </div>
        <div className="detail-section">
          <h3 style={{ color: 'var(--accent-green)' }}>✅ Rewards</h3>
          <div className="detail-text">{build.rewards}</div>
        </div>
      </div>
    </div>
  )
}
