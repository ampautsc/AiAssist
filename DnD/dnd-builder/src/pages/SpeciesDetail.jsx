import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function SpeciesDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [species, setSpecies] = useState(null);
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getSpeciesById(id),
      api.getBuilds({ species: id })
    ]).then(([s, b]) => {
      setSpecies(s);
      setBuilds(b);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, [id]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!species) return <div className="page">Species not found.</div>;

  return (
    <div className="page">
      <Link to="/species" className="back-btn">← Back to Species</Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
        <h2 className="page-title">{species.name}</h2>
        {species.tier && <span className={`tier-badge tier-${species.tier}`}>Tier {species.tier}</span>}
      </div>
      <p className="page-subtitle">
        {species.sourceFull || species.source}
        {species.creatureType && species.creatureType !== 'Humanoid' && ` · ${species.creatureType}`}
      </p>

      {/* Description */}
      {species.description && (
        <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>
          {species.description}
        </div>
      )}

      {/* Core Stats */}
      <div className="detail-section">
        <h3>Core Traits</h3>
        <div className="tag-list" style={{ marginTop: 0 }}>
          <span className="tag">⚡ Speed: {species.speed?.walk || 30}ft</span>
          {species.speed?.fly > 0 && <span className="tag" style={{ borderColor: 'var(--accent-blue)' }}>🦅 Fly: {species.speed.fly}ft</span>}
          {species.speed?.swim > 0 && <span className="tag" style={{ borderColor: 'var(--accent-blue)' }}>🏊 Swim: {species.speed.swim}ft</span>}
          {species.speed?.climb > 0 && <span className="tag" style={{ borderColor: 'var(--accent-green)' }}>🧗 Climb: {species.speed.climb}ft</span>}
          {species.darkvision > 0 && <span className="tag">👁 Darkvision: {species.darkvision}ft</span>}
          <span className="tag">📏 Size: {(species.size || ['Medium']).join(' or ')}</span>
          {species.creatureType && <span className="tag" style={{ borderColor: species.creatureType === 'Fey' ? 'var(--accent-purple)' : species.creatureType === 'Construct' ? 'var(--accent-blue)' : 'var(--border)' }}>
            {species.creatureType === 'Fey' ? '🧚' : species.creatureType === 'Construct' ? '⚙️' : '👤'} {species.creatureType}
          </span>}
          {(species.languages || []).length > 0 && <span className="tag">🗣 {species.languages.join(', ')}</span>}
        </div>
      </div>

      {/* ASI */}
      {species.asiDescription && (
        <div className="detail-section">
          <h3>Ability Score Increase</h3>
          <div className="detail-text">{species.asiDescription}</div>
          {species.asiFlexible && <div className="tag" style={{ marginTop: '0.5rem', borderColor: 'var(--accent-gold)' }}>Flexible ASI</div>}
          {(species.asiFixed || []).length > 0 && (
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {species.asiFixed.map((a, i) => (
                <span key={i} className="tag" style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>
                  {a.stat} +{a.bonus}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Resistances & Immunities */}
      {((species.resistances || []).length > 0 || (species.damageImmunities || []).length > 0 || (species.conditionImmunities || []).length > 0) && (
        <div className="detail-section">
          <h3>Resistances & Immunities</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(species.resistances || []).map(r => (
              <span key={r} className="tag" style={{ borderColor: 'var(--accent-red)' }}>🛡 Resist: {r}</span>
            ))}
            {(species.damageImmunities || []).map(i => (
              <span key={i} className="tag" style={{ borderColor: 'var(--accent-gold)', color: 'var(--accent-gold)' }}>⭐ Immune: {i}</span>
            ))}
            {(species.conditionImmunities || []).map(c => (
              <span key={c} className="tag" style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}>✓ Immune: {c}</span>
            ))}
          </div>
        </div>
      )}

      {/* Innate Spellcasting */}
      {(species.innateSpells || []).length > 0 && (
        <div className="detail-section">
          <h3>Innate Spellcasting</h3>
          {species.innateSpells.map((sp, i) => (
            <div key={i} className="ability-card">
              <div>
                <span className="ability-name">{sp.spell}</span>
                <span className="ability-cost">{sp.frequency}</span>
                {sp.levelRequired > 1 && <span className="ability-cost">(at level {sp.levelRequired})</span>}
              </div>
              {sp.spellcastingAbility && (
                <div className="ability-notes">Spellcasting Ability: {sp.spellcastingAbility}</div>
              )}
              {sp.notes && <div className="ability-notes">{sp.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Flight Details */}
      {species.hasFlight && (
        <div className="detail-section">
          <h3>Flight</h3>
          <div className="tag-list" style={{ marginTop: 0 }}>
            <span className="tag" style={{ borderColor: 'var(--accent-blue)', color: 'var(--accent-blue)' }}>🦅 Flying Speed: {species.speed?.fly || 'equal to walking'}ft</span>
            {species.flightRestriction && (
              <span className="tag" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>⚠ {species.flightRestriction}</span>
            )}
          </div>
        </div>
      )}

      {/* Natural Armor & Weapons */}
      {(species.naturalArmorAC || (species.naturalWeapons || []).length > 0) && (
        <div className="detail-section">
          <h3>Natural Armor & Weapons</h3>
          {species.naturalArmorAC && (
            <div className="tag" style={{ borderColor: 'var(--accent-green)', color: 'var(--accent-green)', marginBottom: '0.5rem' }}>
              🐢 Natural AC: {species.naturalArmorAC}
            </div>
          )}
          {(species.naturalWeapons || []).map((w, i) => (
            <div key={i} className="ability-card">
              <span className="ability-name">{w.name}</span>
              <span className="ability-cost">{w.damage}</span>
              {w.description && <div className="ability-notes">{w.description}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Proficiencies */}
      {((species.armorProficiencies || []).length > 0 || (species.weaponProficiencies || []).length > 0 ||
        (species.toolProficiencies || []).length > 0 || (species.skillProficiencies || []).length > 0) && (
        <div className="detail-section">
          <h3>Proficiencies</h3>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(species.armorProficiencies || []).map(p => <span key={p} className="tag">🛡 {p} armor</span>)}
            {(species.weaponProficiencies || []).map(p => <span key={p} className="tag">⚔ {p}</span>)}
            {(species.toolProficiencies || []).map(p => <span key={p} className="tag">🔧 {p}</span>)}
            {(species.skillProficiencies || []).map(p => <span key={p} className="tag">📚 {p}</span>)}
          </div>
        </div>
      )}

      {/* Racial Traits */}
      {(species.traitList || []).length > 0 && (
        <div className="detail-section">
          <h3>Racial Traits</h3>
          {species.traitList.map((t, i) => (
            <div key={i} className="ability-card">
              <div className="ability-name" style={{ marginBottom: '0.35rem' }}>{t.name}</div>
              <div className="ability-desc">{t.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Legacy Non-Spell Abilities (from old builds) */}
      {(species.nonSpellAbilities || []).length > 0 && (
        <div className="detail-section">
          <h3>Lore Bard Analysis</h3>
          {species.nonSpellAbilities.map((a, i) => (
            <div key={i} className="ability-card">
              <div>
                <span className="ability-name">{a.name}</span>
                <span className="ability-cost">{a.actionCost}</span>
                {a.usesPerDay && <span className="ability-cost">({a.usesPerDay})</span>}
                {a.isSpell && <span className="tag" style={{ marginLeft: '0.5rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)', fontSize: '0.65rem' }}>IS A SPELL</span>}
              </div>
              <div className="ability-desc">{a.description}</div>
              {a.notes && <div className="ability-notes">{a.notes}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Social Kit */}
      {species.socialKit && (
        <div className="detail-section">
          <h3>Social Toolkit (Rating: {species.socialKit.rating}/10)</h3>
          <div className="tag-list" style={{ marginTop: 0 }}>
            {species.socialKit.highlights?.map((h, i) => (
              <span key={i} className="tag" style={{ borderColor: 'var(--accent-blue)' }}>{h}</span>
            ))}
          </div>
        </div>
      )}

      {/* Combat Notes */}
      {species.combatNotes && (
        <div className="detail-section">
          <h3>Combat Notes</h3>
          <div className="detail-text">{species.combatNotes}</div>
        </div>
      )}

      {/* Variants */}
      {(species.variants || []).length > 0 && (
        <div className="detail-section">
          <h3>Source Variants ({species.variants.length})</h3>
          {species.variants.map((v, i) => (
            <div key={i} className="ability-card" style={{ marginBottom: '0.5rem' }}>
              <div className="ability-name">{v.name || v.sourceFull || 'Variant'}</div>
              <div className="ability-notes" style={{ fontSize: '0.75rem' }}>{v.source}</div>
            </div>
          ))}
        </div>
      )}

      {/* Builds for this species */}
      {builds.length > 0 && (
        <div className="detail-section">
          <h3>Available Builds ({builds.length})</h3>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Build</th>
                <th>Archetype</th>
                <th>AC</th>
                <th>DC</th>
                <th>CHA</th>
                <th>Conc %</th>
                <th>Combat</th>
                <th>Social</th>
                <th>Fun</th>
                <th>Tough</th>
              </tr>
            </thead>
            <tbody>
              {builds.map(b => (
                <tr key={b._id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/builds/${b._id}`)}>
                  <td style={{ color: 'var(--accent-gold)' }}>{b.name.replace(`${species.name} — `, '')}</td>
                  <td><span className={`archetype-badge archetype-${b.archetype}`}>{b.archetype}</span></td>
                  <td>{b.finalAc}</td>
                  <td style={{ color: b.spellDc >= 17 ? 'var(--accent-gold)' : 'inherit' }}>{b.spellDc}</td>
                  <td>{b.finalCha}</td>
                  <td>
                    <span className={`conc-indicator ${b.concentrationHoldPct >= 95 ? 'conc-99' : b.concentrationHoldPct >= 75 ? 'conc-80' : 'conc-60'}`}>
                      {b.concentrationHoldPct}%
                    </span>
                  </td>
                  <td>{b.ratings?.combat}</td>
                  <td>{b.ratings?.social}</td>
                  <td>{b.ratings?.fun}</td>
                  <td>{b.ratings?.durability}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
