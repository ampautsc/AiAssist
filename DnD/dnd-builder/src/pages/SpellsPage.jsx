import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'

const LEVEL_LABELS = ['Cantrip','1st','2nd','3rd','4th','5th','6th','7th','8th','9th'];
const SCHOOLS = ['Abjuration','Conjuration','Divination','Enchantment','Evocation','Illusion','Necromancy','Transmutation'];
const TAGS = ['control','damage','healing','buff','debuff','utility','social','defense','offense','exploration'];

function ratingColor(r) {
  if (r >= 9) return 'var(--accent-gold)';
  if (r >= 7) return 'var(--accent-green)';
  if (r >= 5) return 'var(--accent-blue)';
  if (r >= 3) return 'var(--text-secondary)';
  return 'var(--accent-red)';
}

function ratingLabel(r) {
  if (r >= 9) return 'S';
  if (r >= 7) return 'A';
  if (r >= 5) return 'B';
  if (r >= 3) return 'C';
  return 'F';
}

export default function SpellsPage() {
  const [spells, setSpells] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  // Filters
  const [levelFilter, setLevelFilter] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [concFilter, setConcFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState(''); // 'bard' | 'secrets' | ''
  const [tagFilter, setTagFilter] = useState('');
  const [minRating, setMinRating] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.getSpells()
      .then(s => { setSpells(s); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const filtered = useMemo(() => {
    return spells.filter(s => {
      if (levelFilter !== '' && s.level !== Number(levelFilter)) return false;
      if (schoolFilter && s.school !== schoolFilter) return false;
      if (concFilter === 'yes' && !s.concentration) return false;
      if (concFilter === 'no' && s.concentration) return false;
      if (sourceFilter === 'bard' && !s.bardNative) return false;
      if (sourceFilter === 'secrets' && !s.magicalSecretsCandidate) return false;
      if (tagFilter && !s.tags.includes(tagFilter)) return false;
      if (minRating && s.bardRating < Number(minRating)) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [spells, levelFilter, schoolFilter, concFilter, sourceFilter, tagFilter, minRating, search]);

  // Group by level
  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(s => {
      const key = s.level;
      if (!g[key]) g[key] = [];
      g[key].push(s);
    });
    // Sort within each group by rating desc
    Object.values(g).forEach(arr => arr.sort((a, b) => b.bardRating - a.bardRating));
    return g;
  }, [filtered]);

  const levelKeys = Object.keys(grouped).map(Number).sort((a, b) => a - b);

  // Stats summary
  const stats = useMemo(() => {
    const total = filtered.length;
    const conc = filtered.filter(s => s.concentration).length;
    const avgRating = total ? (filtered.reduce((sum, s) => sum + s.bardRating, 0) / total).toFixed(1) : '—';
    const sTier = filtered.filter(s => s.bardRating >= 9).length;
    return { total, conc, avgRating, sTier };
  }, [filtered]);

  if (loading) return <div className="loading">Loading spells...</div>;

  return (
    <div className="page">
      <h2 className="page-title">📜 Spell Codex</h2>
      <p className="page-subtitle">
        {spells.filter(s => s.bardNative).length} Bard spells + {spells.filter(s => s.magicalSecretsCandidate && !s.bardNative).length} Magical Secrets candidates — rated for Lore Bard
      </p>

      {/* Summary cards */}
      <div className="spell-summary">
        <div className="spell-summary-card">
          <div className="spell-summary-value">{stats.total}</div>
          <div className="spell-summary-label">Showing</div>
        </div>
        <div className="spell-summary-card">
          <div className="spell-summary-value" style={{ color: 'var(--accent-gold)' }}>{stats.sTier}</div>
          <div className="spell-summary-label">S-Tier</div>
        </div>
        <div className="spell-summary-card">
          <div className="spell-summary-value">{stats.avgRating}</div>
          <div className="spell-summary-label">Avg Rating</div>
        </div>
        <div className="spell-summary-card">
          <div className="spell-summary-value" style={{ color: 'var(--accent-red)' }}>{stats.conc}</div>
          <div className="spell-summary-label">Concentration</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search spells..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ minWidth: '200px' }}
        />
        <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          <option value="">All Levels</option>
          {LEVEL_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
        </select>
        <select value={schoolFilter} onChange={e => setSchoolFilter(e.target.value)}>
          <option value="">All Schools</option>
          {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={concFilter} onChange={e => setConcFilter(e.target.value)}>
          <option value="">Concentration?</option>
          <option value="yes">Concentration</option>
          <option value="no">Non-Concentration</option>
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}>
          <option value="">All Sources</option>
          <option value="bard">Bard Native</option>
          <option value="secrets">Magical Secrets</option>
        </select>
        <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}>
          <option value="">All Tags</option>
          {TAGS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={minRating} onChange={e => setMinRating(e.target.value)}>
          <option value="">Any Rating</option>
          <option value="9">S-Tier (9+)</option>
          <option value="7">A-Tier (7+)</option>
          <option value="5">B-Tier (5+)</option>
        </select>
      </div>

      {/* Spell list grouped by level */}
      {levelKeys.map(lvl => (
        <div key={lvl} className="spell-level-group">
          <h3 className="spell-level-header">
            <span>{LEVEL_LABELS[lvl]}{lvl > 0 ? ' Level' : 's'}</span>
            <span className="spell-level-count">{grouped[lvl].length} spell{grouped[lvl].length !== 1 ? 's' : ''}</span>
          </h3>
          <div className="spell-table">
            <div className="spell-table-header">
              <span className="spell-col-rating">Tier</span>
              <span className="spell-col-name">Spell</span>
              <span className="spell-col-school">School</span>
              <span className="spell-col-cast">Cast</span>
              <span className="spell-col-range">Range</span>
              <span className="spell-col-dur">Duration</span>
              <span className="spell-col-tags">Tags</span>
            </div>
            {grouped[lvl].map(spell => (
              <div key={spell._id}>
                <div
                  className={`spell-row ${expanded === spell._id ? 'spell-row-expanded' : ''} ${spell.magicalSecretsCandidate && !spell.bardNative ? 'spell-row-secrets' : ''}`}
                  onClick={() => setExpanded(expanded === spell._id ? null : spell._id)}
                >
                  <span className="spell-col-rating">
                    <span className="spell-rating-badge" style={{ background: ratingColor(spell.bardRating) + '22', color: ratingColor(spell.bardRating), borderColor: ratingColor(spell.bardRating) }}>
                      {ratingLabel(spell.bardRating)} {spell.bardRating}
                    </span>
                  </span>
                  <span className="spell-col-name">
                    <span className="spell-name-text">{spell.name}</span>
                    {spell.concentration && <span className="spell-conc-badge" title="Concentration">C</span>}
                    {spell.ritual && <span className="spell-ritual-badge" title="Ritual">R</span>}
                    {spell.magicalSecretsCandidate && !spell.bardNative && <span className="spell-ms-badge" title="Magical Secrets">MS</span>}
                  </span>
                  <span className="spell-col-school">{spell.school}</span>
                  <span className="spell-col-cast">{spell.castingTime}</span>
                  <span className="spell-col-range">{spell.range}</span>
                  <span className="spell-col-dur">{spell.duration}</span>
                  <span className="spell-col-tags">
                    {spell.tags.map(t => <span key={t} className="spell-tag">{t}</span>)}
                  </span>
                </div>
                {expanded === spell._id && (
                  <div className="spell-detail-panel">
                    {spell.bardNotes && (
                      <div className="spell-bard-notes">
                        <strong>🎵 Bard Analysis:</strong> {spell.bardNotes}
                      </div>
                    )}
                    {spell.magicalSecretsNotes && (
                      <div className="spell-ms-notes">
                        <strong>🔮 Magical Secrets:</strong> {spell.magicalSecretsNotes}
                      </div>
                    )}
                    <div className="spell-description">
                      {spell.description.map((p, i) => <p key={i}>{p}</p>)}
                    </div>
                    {spell.higherLevel?.length > 0 && (
                      <div className="spell-higher-level">
                        <strong>At Higher Levels:</strong> {spell.higherLevel.join(' ')}
                      </div>
                    )}
                    <div className="spell-meta">
                      <span><strong>Components:</strong> {spell.components.join(', ')}{spell.material ? ` (${spell.material})` : ''}</span>
                      {spell.savingThrow && <span><strong>Save:</strong> {spell.savingThrow}</span>}
                      {spell.damageType && <span><strong>Damage:</strong> {spell.damageType}</span>}
                      <span><strong>Classes:</strong> {spell.classes.join(', ')}</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="loading">No spells match your filters.</div>
      )}
    </div>
  );
}
