import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function ComparePage() {
  const [builds, setBuilds] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.getBuilds().then(b => { setBuilds(b); setLoading(false); });
  }, []);

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const selectedBuilds = builds.filter(b => selected.includes(b._id));

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="page">
      <h2 className="page-title">Compare Builds</h2>
      <p className="page-subtitle">Select up to 5 builds to compare side-by-side</p>

      {/* Selected comparison */}
      {selectedBuilds.length > 0 && (
        <div style={{ marginBottom: '2rem', overflowX: 'auto' }}>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Stat</th>
                {selectedBuilds.map(b => (
                  <th key={b._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/builds/${b._id}`)}>
                    {b.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Species</td>
                {selectedBuilds.map(b => <td key={b._id}>{b.species?.name}</td>)}
              </tr>
              <tr>
                <td>Archetype</td>
                {selectedBuilds.map(b => (
                  <td key={b._id}><span className={`archetype-badge archetype-${b.archetype}`}>{b.archetype}</span></td>
                ))}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>AC</td>
                {selectedBuilds.map(b => {
                  const best = Math.max(...selectedBuilds.map(x => x.finalAc));
                  return <td key={b._id} style={{ fontWeight: 700, color: b.finalAc === best ? 'var(--accent-green)' : 'inherit' }}>{b.finalAc}</td>
                })}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Spell DC</td>
                {selectedBuilds.map(b => {
                  const best = Math.max(...selectedBuilds.map(x => x.spellDc));
                  return <td key={b._id} style={{ fontWeight: 700, color: b.spellDc === best ? 'var(--accent-gold)' : 'inherit' }}>{b.spellDc}</td>
                })}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>CHA</td>
                {selectedBuilds.map(b => <td key={b._id} style={{ fontWeight: 700 }}>{b.finalCha}</td>)}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Conc Hold %</td>
                {selectedBuilds.map(b => {
                  const cls = b.concentrationHoldPct >= 95 ? 'conc-99' : b.concentrationHoldPct >= 75 ? 'conc-80' : 'conc-60';
                  return <td key={b._id}><span className={`conc-indicator ${cls}`}>{b.concentrationHoldPct}%</span></td>
                })}
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>CON Save</td>
                {selectedBuilds.map(b => (
                  <td key={b._id} style={{ fontSize: '0.8rem' }}>
                    {b.conSaveType === 'both' ? 'Adv + Prof' :
                     b.conSaveType === 'advantage' ? 'Advantage' :
                     b.conSaveType === 'proficiency' ? 'Proficiency' : 'None'}
                  </td>
                ))}
              </tr>
              <tr><td colSpan={selectedBuilds.length + 1} style={{ borderBottom: '2px solid var(--accent-gold)', padding: '0.25rem' }} /></tr>
              <tr>
                <td>⚔️ Combat</td>
                {selectedBuilds.map(b => {
                  const best = Math.max(...selectedBuilds.map(x => x.ratings?.combat || 0));
                  return <td key={b._id} style={{ fontWeight: 700, color: b.ratings?.combat === best ? 'var(--accent-red)' : 'inherit' }}>{b.ratings?.combat}/10</td>
                })}
              </tr>
              <tr>
                <td>🎭 Social</td>
                {selectedBuilds.map(b => {
                  const best = Math.max(...selectedBuilds.map(x => x.ratings?.social || 0));
                  return <td key={b._id} style={{ fontWeight: 700, color: b.ratings?.social === best ? 'var(--accent-blue)' : 'inherit' }}>{b.ratings?.social}/10</td>
                })}
              </tr>
              <tr>
                <td>🎲 Fun</td>
                {selectedBuilds.map(b => {
                  const best = Math.max(...selectedBuilds.map(x => x.ratings?.fun || 0));
                  return <td key={b._id} style={{ fontWeight: 700, color: b.ratings?.fun === best ? 'var(--accent-gold)' : 'inherit' }}>{b.ratings?.fun}/10</td>
                })}
              </tr>
              <tr>
                <td>🛡 Durability</td>
                {selectedBuilds.map(b => {
                  const best = Math.max(...selectedBuilds.map(x => x.ratings?.durability || 0));
                  return <td key={b._id} style={{ fontWeight: 700, color: b.ratings?.durability === best ? 'var(--accent-green)' : 'inherit' }}>{b.ratings?.durability}/10</td>
                })}
              </tr>
              <tr><td colSpan={selectedBuilds.length + 1} style={{ borderBottom: '2px solid var(--accent-gold)', padding: '0.25rem' }} /></tr>
              <tr>
                <td>Feats</td>
                {selectedBuilds.map(b => (
                  <td key={b._id} style={{ fontSize: '0.8rem' }}>
                    {b.feats?.map(f => f.name).join(', ')}
                  </td>
                ))}
              </tr>
              <tr>
                <td>Items</td>
                {selectedBuilds.map(b => (
                  <td key={b._id} style={{ fontSize: '0.8rem' }}>
                    {b.items?.map(i => i.name.replace(/ \(.*\)/, '')).join(', ')}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Build selector */}
      <h3 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
        {selected.length === 0 ? 'Click builds to select for comparison' : `${selected.length}/5 selected`}
        {selected.length > 0 && (
          <button onClick={() => setSelected([])} style={{
            marginLeft: '1rem', background: 'none', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', padding: '0.25rem 0.75rem', borderRadius: '6px',
            cursor: 'pointer', fontSize: '0.8rem'
          }}>Clear All</button>
        )}
      </h3>

      <div className="card-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {builds.map(b => {
          const isSelected = selected.includes(b._id);
          return (
            <div key={b._id}
              className="card"
              onClick={() => toggleSelect(b._id)}
              style={{
                borderColor: isSelected ? 'var(--accent-gold)' : undefined,
                background: isSelected ? 'rgba(212,168,75,0.08)' : undefined
              }}
            >
              <div className="card-header">
                <div>
                  <div className="card-title" style={{ fontSize: '0.95rem' }}>{b.name}</div>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <span className={`archetype-badge archetype-${b.archetype}`}>{b.archetype}</span>
                  {isSelected && <span style={{ fontSize: '1.1rem' }}>✓</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>AC {b.finalAc}</span>
                <span>DC {b.spellDc}</span>
                <span>CHA {b.finalCha}</span>
                <span className={`conc-indicator ${b.concentrationHoldPct >= 95 ? 'conc-99' : b.concentrationHoldPct >= 75 ? 'conc-80' : 'conc-60'}`}>
                  {b.concentrationHoldPct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  )
}
