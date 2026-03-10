import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import HexMap from '../components/HexMap'

// ─── STYLING HELPERS ────────────────────────────────────────────────────────

function logLineStyle(line) {
  const l = line.toLowerCase();
  if (l.includes('=== round')) return { color: 'var(--accent-gold)', fontWeight: 700, fontSize: '0.95rem', marginTop: '0.75rem' };
  if (l.includes('wins!') || l.includes('victory')) return { color: 'var(--accent-green)', fontWeight: 700 };
  if (l.includes('defeated') || l.includes('falls!') || l.includes('drops to 0')) return { color: 'var(--accent-red)', fontWeight: 600 };
  if (l.includes('damage') || l.includes('hits')) return { color: '#e8c170' };
  if (l.includes('miss') || l.includes('fails')) return { color: '#888' };
  if (l.includes('saves') || l.includes('passes')) return { color: '#7cd4a0' };
  if (l.includes('casts') || l.includes('spell')) return { color: '#a497e8' };
  if (l.includes('concentration')) return { color: '#e89797' };
  if (l.includes('initiative') || l.includes('turn:')) return { color: '#8bb8e8' };
  if (l.includes('frightened') || l.includes('charmed') || l.includes('condition')) return { color: '#e8a070' };
  if (l.includes('healing') || l.includes('heals') || l.includes('regain')) return { color: '#70e8a0' };
  if (l.startsWith('---') || l.startsWith('===')) return { color: '#555', fontWeight: 600 };
  return { color: '#ccc' };
}

function winnerBadge(winner) {
  if (winner === 'party') return <span style={{ color: 'var(--accent-green)', fontWeight: 700 }}>✅ Party Wins</span>;
  if (winner === 'enemy') return <span style={{ color: 'var(--accent-red)', fontWeight: 700 }}>❌ Enemy Wins</span>;
  return <span style={{ color: '#888', fontWeight: 700 }}>⏸ Draw</span>;
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function CombatLogPage() {
  const { buildId, scenarioId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [logData, setLogData] = useState(null);
  const [buildScenarios, setBuildScenarios] = useState(null);
  const [selectedRun, setSelectedRun] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('');
  const [showMap, setShowMap] = useState(true);
  const [selectedMapRound, setSelectedMapRound] = useState(0);

  // Load data
  useEffect(() => {
    setLoading(true);
    setError(null);

    if (buildId && scenarioId) {
      // Load specific combat log
      Promise.all([
        api.getCombatLog(buildId, scenarioId),
        api.getCombatLogsByBuild(buildId),
      ]).then(([log, scenarios]) => {
        setLogData(log);
        setBuildScenarios(scenarios.scenarios || []);
        setSelectedRun(0);
      }).catch(err => setError(err.message))
        .finally(() => setLoading(false));
    } else if (buildId) {
      // Load scenario list for a build
      api.getCombatLogsByBuild(buildId)
        .then(data => setBuildScenarios(data.scenarios || []))
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    } else {
      // Load index of all available logs
      api.getCombatLogs()
        .then(data => {
          // Group by buildId for display
          const byBuild = {};
          for (const entry of (data.logs || [])) {
            if (!byBuild[entry.buildId]) byBuild[entry.buildId] = [];
            byBuild[entry.buildId].push(entry);
          }
          setBuildScenarios(byBuild);
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [buildId, scenarioId]);

  if (loading) return <div className="page" style={{ padding: '2rem' }}>Loading combat logs...</div>;
  if (error) return <div className="page" style={{ padding: '2rem', color: 'var(--accent-red)' }}>Error: {error}</div>;

  // ── FULL LOG VIEW ─────────────────────────────────────────────────────────
  if (logData) {
    const run = logData.sampleLogs?.[selectedRun];
    const logLines = run?.log || [];
    const filteredLines = filter
      ? logLines.filter(l => l.toLowerCase().includes(filter.toLowerCase()))
      : logLines;

    return (
      <div className="page" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, color: 'var(--accent-blue)' }}>⚔️ Combat Log</h2>
            <div style={{ fontSize: '1.1rem', marginTop: '0.25rem' }}>
              <strong>{logData.buildName}</strong>
              <span style={{ color: '#888' }}> vs </span>
              <strong style={{ color: 'var(--accent-gold)' }}>{logData.scenarioName}</strong>
            </div>
            <div style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.25rem' }}>
              Win Rate: <strong style={{ color: logData.winRate >= 0.5 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {Math.round(logData.winRate * 100)}%
              </strong>
              &nbsp;|&nbsp; Avg Rounds: {logData.avgRounds}
              &nbsp;|&nbsp; {logData.numRuns} simulations ({logData.sampleLogs?.length || 0} logged)
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate(`/builds/${buildId}`)}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              View Build →
            </button>
            <button
              onClick={() => navigate('/scenarios')}
              style={{ padding: '0.4rem 0.8rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)', color: '#ccc', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
            >
              ← Scenarios
            </button>
          </div>
        </div>

        {/* Scenario switcher */}
        {buildScenarios?.length > 0 && (
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {buildScenarios.map(s => (
              <button
                key={s.scenarioId}
                onClick={() => navigate(`/combat-logs/${buildId}/${s.scenarioId}`)}
                style={{
                  padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', border: 'none', cursor: 'pointer',
                  background: s.scenarioId === scenarioId ? 'var(--accent-blue)' : 'rgba(255,255,255,0.08)',
                  color: s.scenarioId === scenarioId ? '#fff' : '#aaa',
                }}
              >
                {s.scenarioName} ({Math.round(s.winRate * 100)}%)
              </button>
            ))}
          </div>
        )}

        {/* Run selector */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ color: '#888', fontSize: '0.85rem' }}>Run:</span>
          {logData.sampleLogs?.map((log, i) => (
            <button
              key={i}
              onClick={() => { setSelectedRun(i); setSelectedMapRound(0); }}
              style={{
                padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', border: 'none', cursor: 'pointer',
                background: i === selectedRun ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)',
                color: i === selectedRun ? '#000' : '#aaa',
              }}
            >
              #{i + 1} {log.winner === 'party' ? '✅' : log.winner === 'enemy' ? '❌' : '⏸'} ({log.rounds}r)
            </button>
          ))}
        </div>

        {/* Run summary */}
        {run && (
          <div style={{
            display: 'flex', gap: '1.5rem', padding: '0.6rem 1rem', marginBottom: '1rem',
            background: 'rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.85rem', flexWrap: 'wrap',
          }}>
            {winnerBadge(run.winner)}
            <span style={{ color: '#aaa' }}>Rounds: {run.rounds}</span>
            <span style={{ color: run.bardHpPct > 0.5 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
              Bard HP: {Math.round(run.bardHpPct * 100)}%
            </span>
            {run.analytics?.map((a, i) => (
              <span key={i} style={{ color: a.side === 'party' ? '#8bb8e8' : '#e89797', fontSize: '0.8rem' }}>
                {a.name}: {a.damageDealt}dmg dealt, {a.hitRate}% hit
              </span>
            ))}
          </div>
        )}

        {/* Filter */}
        <div style={{ marginBottom: '0.5rem' }}>
          <input
            type="text"
            placeholder="Filter log lines (e.g. 'damage', 'spell', 'concentration')..."
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              width: '100%', padding: '0.5rem', borderRadius: '4px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#ccc', fontSize: '0.85rem',
            }}
          />
        </div>

        {/* Hex Map */}
        {run?.positionSnapshots && run.positionSnapshots.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <button
                onClick={() => setShowMap(m => !m)}
                style={{
                  padding: '0.3rem 0.7rem', borderRadius: '4px', fontSize: '0.8rem',
                  background: showMap ? 'var(--accent-blue)' : 'rgba(255,255,255,0.08)',
                  color: showMap ? '#fff' : '#aaa', border: 'none', cursor: 'pointer',
                }}
              >
                🗺️ Hex Map {showMap ? '▾' : '▸'}
              </button>
              {showMap && (
                <>
                  <span style={{ color: '#888', fontSize: '0.8rem' }}>Round:</span>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {run.positionSnapshots.map((snap, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedMapRound(i)}
                        style={{
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem',
                          border: 'none', cursor: 'pointer',
                          background: i === selectedMapRound ? 'var(--accent-gold)' : 'rgba(255,255,255,0.08)',
                          color: i === selectedMapRound ? '#000' : '#aaa',
                        }}
                      >
                        {snap.round === 0 ? 'Start' : `R${snap.round}`}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            {showMap && run.positionSnapshots[selectedMapRound] && (
              <div style={{
                background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '1rem',
                overflowX: 'auto',
              }}>
                <HexMap
                  combatants={run.positionSnapshots[selectedMapRound].combatants}
                  round={run.positionSnapshots[selectedMapRound].round}
                  gridWidth={14}
                  gridHeight={10}
                  hexSize={28}
                />
              </div>
            )}
          </div>
        )}

        {/* Log output */}
        <div style={{
          fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          fontSize: '0.8rem',
          lineHeight: 1.5,
          background: 'rgba(0,0,0,0.4)',
          borderRadius: '8px',
          padding: '1rem',
          maxHeight: '65vh',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {filteredLines.length === 0 && (
            <div style={{ color: '#666', fontStyle: 'italic' }}>
              {filter ? 'No log lines match filter.' : 'No log data available for this run.'}
            </div>
          )}
          {filteredLines.map((line, i) => (
            <div key={i} style={{ ...logLineStyle(line), padding: '1px 0' }}>
              {line}
            </div>
          ))}
        </div>

        <div style={{ color: '#555', fontSize: '0.75rem', marginTop: '0.5rem', textAlign: 'right' }}>
          {filteredLines.length} / {logLines.length} lines
        </div>
      </div>
    );
  }

  // ── NO SPECIFIC LOG — show available scenarios ────────────────────────────
  return (
    <div className="page" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h2 style={{ color: 'var(--accent-blue)' }}>⚔️ Combat Logs</h2>
      <p style={{ color: '#888' }}>
        Select a build and scenario to view turn-by-turn combat logs from the simulation engine.
      </p>
      {!buildScenarios || (Array.isArray(buildScenarios) && buildScenarios.length === 0) ? (
        <p style={{ color: '#666' }}>No combat logs available. Run a simulation first.</p>
      ) : (
        <p style={{ color: '#888' }}>
          Use the Scenarios page to find a build, then click "View Log" to see its combat details.
        </p>
      )}
      <button
        onClick={() => navigate('/scenarios')}
        style={{
          padding: '0.5rem 1rem', borderRadius: '4px', background: 'var(--accent-blue)',
          color: '#fff', border: 'none', cursor: 'pointer', marginTop: '0.5rem',
        }}
      >
        ← Back to Scenarios
      </button>
    </div>
  );
}
