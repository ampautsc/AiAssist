import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function SpeciesPage() {
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSource, setFilterSource] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFlight, setFilterFlight] = useState('');
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.getSpecies()
      .then(s => { setSpecies(s); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  // Get unique sources and creature types for filters
  const sources = [...new Set(species.map(s => s.source).filter(Boolean))].sort();
  const creatureTypes = [...new Set(species.map(s => s.creatureType).filter(Boolean))].sort();

  const filtered = species.filter(s => {
    if (filterSource && s.source !== filterSource) return false;
    if (filterType && s.creatureType !== filterType) return false;
    if (filterFlight === 'yes' && !s.hasFlight) return false;
    if (filterFlight === 'no' && s.hasFlight) return false;
    if (searchText && !s.name.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });

  if (loading) return <div className="loading">Loading species...</div>;

  return (
    <div className="page">
      <h2 className="page-title">Species Browser</h2>
      <p className="page-subtitle">{species.length} D&D 5e species from all sourcebooks</p>

      <div className="filter-bar" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
        <input
          type="text"
          placeholder="Search species..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ padding: '0.5rem', background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', minWidth: '200px' }}
        />
        <select value={filterSource} onChange={e => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          {sources.map(src => <option key={src} value={src}>{src}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Creature Types</option>
          {creatureTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}
        </select>
        <select value={filterFlight} onChange={e => setFilterFlight(e.target.value)}>
          <option value="">Flight: Any</option>
          <option value="yes">Has Flight</option>
          <option value="no">No Flight</option>
        </select>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', alignSelf: 'center' }}>
          Showing {filtered.length} of {species.length}
        </span>
      </div>

      <div className="card-grid">
        {filtered.map(s => (
          <div key={s._id} className="card" onClick={() => navigate(`/species/${s._id}`)}>
            <div className="card-header">
              <div>
                <div className="card-title">{s.name}</div>
                <div className="card-subtitle" style={{ fontSize: '0.75rem' }}>
                  {s.source && <span>{s.source}</span>}
                  {s.creatureType && s.creatureType !== 'Humanoid' && <span> · {s.creatureType}</span>}
                  {s.size && <span> · {s.size.join('/')}</span>}
                </div>
              </div>
              {s.tier && <span className={`tier-badge tier-${s.tier}`}>Tier {s.tier}</span>}
            </div>

            {/* Tag badges */}
            <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {s.traits?.feyType && <span className="tag" style={{ borderColor: 'var(--accent-purple)' }}>🧚 Fey</span>}
              {s.traits?.magicResistance && <span className="tag" style={{ borderColor: 'var(--accent-gold)' }}>✨ Magic Resistance</span>}
              {s.traits?.permanentFlight && <span className="tag" style={{ borderColor: 'var(--accent-blue)' }}>🦅 Flight</span>}
              {s.traits?.naturalArmor && <span className="tag" style={{ borderColor: 'var(--accent-green)' }}>🐢 AC {s.traits.naturalArmor}</span>}
              {s.traits?.poisonImmunity && <span className="tag" style={{ borderColor: 'var(--accent-green)' }}>☠️ Poison Immune</span>}
              {s.traits?.innateTelepathy && <span className="tag" style={{ borderColor: 'var(--accent-blue)' }}>🧠 Telepathy</span>}
              {s.darkvision > 0 && <span className="tag">👁 DV {s.darkvision}ft</span>}
              {(s.resistances || []).map(r => (
                <span key={r} className="tag" style={{ borderColor: 'var(--accent-red)' }}>🛡 {r} res.</span>
              ))}
              {(s.innateSpells || []).length > 0 && (
                <span className="tag" style={{ borderColor: 'var(--accent-purple)' }}>🔮 {s.innateSpells.length} spells</span>
              )}
            </div>

            {/* Key traits preview */}
            {(s.traitList || []).length > 0 && (
              <div style={{ marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Traits</div>
                {(s.traitList || []).slice(0, 3).map((t, i) => (
                  <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.1rem' }}>
                    <span style={{ color: 'var(--accent-gold)' }}>{t.name}</span>
                  </div>
                ))}
                {(s.traitList || []).length > 3 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>+{s.traitList.length - 3} more...</div>
                )}
              </div>
            )}

            {/* Description preview */}
            {s.description && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {s.description.substring(0, 120)}{s.description.length > 120 ? '...' : ''}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
