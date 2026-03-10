import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

function RatingBar({ label, value, color }) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <span className="stat-value" style={{ color }}>{value}</span>
      <div className="stat-bar">
        <div className="stat-bar-fill" style={{ width: `${value * 10}%`, background: color }} />
      </div>
    </div>
  )
}

function ConcIndicator({ pct }) {
  const cls = pct >= 95 ? 'conc-99' : pct >= 75 ? 'conc-80' : pct >= 60 ? 'conc-60' : 'conc-low';
  return <span className={`conc-indicator ${cls}`}>🛡 {pct}%</span>
}

// Classify a build into its feat path tier based on CHA
function getFeatPath(build) {
  if (build.finalCha >= 20) return 'dc17';
  if (build.finalCha >= 18) return 'dc16';
  return 'dc15';
}

const FEAT_PATHS = {
  dc17: {
    label: 'DC 17 — Max CHA (20)',
    desc: 'Half-feat +1 CHA → ASI +1 CHA. Both feat slots boost CHA. No room for defense.',
    color: 'var(--accent-gold)',
    borderColor: 'rgba(212,168,75,0.4)',
    tradeoff: 'Highest save DCs. Zero concentration protection from feats.'
  },
  dc16: {
    label: 'DC 16 — Defense or Balanced (CHA 18–19)',
    desc: 'Tasha\'s +2 CHA reaches 18 (mod +4). Feat slots go to armor, War Caster, or utility. One CHA half-feat takes CHA to 19 (same mod).',
    color: 'var(--accent-blue)',
    borderColor: 'rgba(74,158,255,0.4)',
    tradeoff: 'Same DC whether CHA 18 or 19. Defense feats make you unkillable.'
  },
  dc15: {
    label: 'DC 15 — No Species CHA Bonus',
    desc: 'Only possible without a +2 CHA species bonus. Not used in current builds.',
    color: 'var(--accent-green)',
    borderColor: 'rgba(74,222,128,0.4)',
    tradeoff: 'Lower DCs. Only relevant if species ASI goes elsewhere.'
  }
};

function BuildCard({ build, onClick }) {
  const species = build.species;
  const archCls = `archetype-${build.archetype}`;
  const path = getFeatPath(build);
  const pathInfo = FEAT_PATHS[path];

  return (
    <div className="card" onClick={onClick} style={{ borderTop: `3px solid ${pathInfo.color}` }}>
      <div className="card-header">
        <div>
          <div className="card-title">{build.name}</div>
          <div className="card-subtitle">{species?.flavorText || species?.name}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
          <span className={`tier-badge tier-${species?.tier}`}>Tier {species?.tier}</span>
          <span className={`archetype-badge ${archCls}`}>{build.archetype}</span>
          <span style={{
            fontSize: '0.7rem', color: pathInfo.color, fontWeight: 600,
            letterSpacing: '0.02em'
          }}>DC {build.spellDc} path</span>
        </div>
      </div>

      <div className="build-stats">
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
          <ConcIndicator pct={build.concentrationHoldPct} />
          <div className="build-stat-label">Conc Hold</div>
        </div>
      </div>

      <div className="ratings-grid">
        <RatingBar label="Combat" value={build.ratings?.combat} color="var(--accent-red)" />
        <RatingBar label="Social" value={build.ratings?.social} color="var(--accent-blue)" />
        <RatingBar label="Fun" value={build.ratings?.fun} color="var(--accent-gold)" />
        <RatingBar label="Tough" value={build.ratings?.durability} color="var(--accent-green)" />
      </div>

      <div className="tag-list">
        {build.feats?.map(f => <span key={f._id} className="tag">🎯 {f.name}</span>)}
        {build.items?.map(i => <span key={i._id} className="tag">✨ {i.name.replace(/ \(.*\)/, '')}</span>)}
      </div>
    </div>
  )
}

export default function BuildsPage() {
  const [builds, setBuilds] = useState([]);
  const [species, setSpecies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSpecies, setFilterSpecies] = useState('');
  const [filterArchetype, setFilterArchetype] = useState('');
  const [filterPath, setFilterPath] = useState('');
  const [sortBy, setSortBy] = useState('fun');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.getBuilds(), api.getSpecies()])
      .then(([b, s]) => { setBuilds(b); setSpecies(s); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const filtered = builds
    .filter(b => !filterSpecies || b.species?._id === filterSpecies)
    .filter(b => !filterArchetype || b.archetype === filterArchetype)
    .filter(b => !filterPath || getFeatPath(b) === filterPath)
    .sort((a, b) => {
      if (sortBy === 'ac') return b.finalAc - a.finalAc;
      if (sortBy === 'dc') return b.spellDc - a.spellDc;
      if (sortBy === 'conc') return b.concentrationHoldPct - a.concentrationHoldPct;
      if (sortBy === 'overall') return (b.overallScore || 0) - (a.overallScore || 0);
      return (b.ratings?.[sortBy] || 0) - (a.ratings?.[sortBy] || 0);
    });

  if (loading) return <div className="loading">Loading builds...</div>;

  // Count builds per path
  const pathCounts = {};
  builds.forEach(b => {
    const p = getFeatPath(b);
    pathCounts[p] = (pathCounts[p] || 0) + 1;
  });

  return (
    <div className="page">
      <h2 className="page-title">Character Builds</h2>
      <p className="page-subtitle">Level 8 College of Lore Bard — CHA 16 base (rolled) — Tasha's Flexible +2 CHA = 18</p>

      {/* Feat Path Explainer */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
        padding: '1.25rem',
        background: 'rgba(0,0,0,0.25)',
        borderRadius: '12px',
        border: '1px solid var(--border)'
      }}>
        <div style={{ gridColumn: '1 / -1', marginBottom: '0.25rem' }}>
          <div style={{ fontFamily: 'Cinzel, serif', color: 'var(--accent-gold)', fontSize: '1rem', marginBottom: '0.25rem' }}>
            The Core Tradeoff
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            CHA 16 base + Tasha's +2 = CHA 18 (mod +4, DC 16 with instrument). Half-feat reaches 19 (same mod). Half-feat + ASI reaches 20 (mod +5, DC 17).
            Higher CHA = higher DCs = more enemies fail your saves. But every feat spent on CHA is a feat NOT spent holding concentration.
          </div>
        </div>
        {['dc17', 'dc16', 'dc15'].map(path => {
          const p = FEAT_PATHS[path];
          const isActive = filterPath === path;
          return (
            <div key={path} onClick={() => setFilterPath(isActive ? '' : path)} style={{
              padding: '1rem',
              borderRadius: '8px',
              border: `1px solid ${isActive ? p.color : p.borderColor}`,
              background: isActive ? `${p.borderColor}` : 'rgba(0,0,0,0.15)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}>
              <div style={{ color: p.color, fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                {p.label}
                <span style={{ float: 'right', fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {pathCounts[path] || 0} builds
                </span>
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                {p.desc}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                {p.tradeoff}
              </div>
            </div>
          );
        })}
      </div>

      <div className="filter-bar">
        <select value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)}>
          <option value="">All Species</option>
          {species.map(s => <option key={s._id} value={s._id}>{s.name} (Tier {s.tier})</option>)}
        </select>
        <select value={filterArchetype} onChange={e => setFilterArchetype(e.target.value)}>
          <option value="">All Archetypes</option>
          <option value="tank">Tank</option>
          <option value="balanced">Balanced</option>
          <option value="controller">Controller</option>
          <option value="glass-cannon">Glass Cannon</option>
          <option value="evasion">Evasion</option>
          <option value="social-predator">Social Predator</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="fun">Sort: Fun</option>
          <option value="combat">Sort: Combat</option>
          <option value="social">Sort: Social</option>
          <option value="durability">Sort: Durability</option>
          <option value="dc">Sort: Spell DC</option>
          <option value="ac">Sort: AC</option>
          <option value="conc">Sort: Conc Hold %</option>
        </select>
        {filterPath && (
          <button onClick={() => setFilterPath('')} style={{
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text-secondary)', padding: '0.4rem 0.75rem',
            borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem'
          }}>Clear path filter ✕</button>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {filtered.length} build{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="card-grid">
        {filtered.map(build => (
          <BuildCard key={build._id} build={build} onClick={() => navigate(`/builds/${build._id}`)} />
        ))}
      </div>
    </div>
  )
}
