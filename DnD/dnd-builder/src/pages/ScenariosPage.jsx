import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

// ─── HELPERS ────────────────────────────────────────────────────────────────

function flyIcon(canFly, flyType) {
  if (!canFly) return '';
  if (flyType === 'permanent') return '✈️P';   // Permanent (Fairy)
  if (flyType === 'item') return '✈️I';        // Item (Winged Boots)
  return '✈️L';                                 // Limited (Gem Flight)
}

function scoreColor(score) {
  if (score >= 85) return 'var(--accent-green)';
  if (score >= 70) return 'var(--accent-blue)';
  if (score >= 55) return 'var(--accent-gold)';
  return 'var(--accent-red)';
}

function concColor(pct) {
  if (pct >= 95) return 'var(--accent-green)';
  if (pct >= 80) return 'var(--accent-blue)';
  if (pct >= 60) return 'var(--accent-gold)';
  return 'var(--accent-red)';
}

function Bar({ value, max = 100, color, label }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
      {label && <span style={{ fontSize: '0.75rem', color: '#999', minWidth: '3rem' }}>{label}</span>}
      <div style={{
        flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)',
        borderRadius: '3px', overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: color || 'var(--accent-blue)',
          borderRadius: '3px', transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.75rem', color: color || '#ccc', fontWeight: 600, minWidth: '2.5rem', textAlign: 'right' }}>
        {typeof value === 'number' ? value.toFixed(1) : value}
      </span>
    </div>
  );
}


// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export default function ScenariosPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [expandedBuild, setExpandedBuild] = useState(null);

  useEffect(() => {
    api.getScenarios()
      .then(d => {
        setData(d);
        if (d.scenarioResults?.length > 0) {
          setSelectedScenario(d.scenarioResults[0].id);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-container"><div className="loading-msg">⏳ Running scenario evaluations across all builds...</div></div>;
  if (error) return <div className="page-container"><div className="error-msg">❌ {error}</div></div>;
  if (!data) return null;

  const { scenarioResults, buildSummaries, ironComparison, partyAnalysis } = data;

  const tabs = [
    { id: 'overview', label: '📊 Overview', desc: 'Build rankings across all scenarios' },
    { id: 'scenarios', label: '⚔️ Scenarios', desc: 'Per-scenario breakdown' },
    { id: 'iron', label: '🛡️ Iron vs Armored', desc: 'The concentration question answered' },
    { id: 'party', label: '🤝 Party Comp', desc: 'What each build needs in a party' },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>📊 Scenario Evaluation Dashboard</h2>
        <p style={{ color: '#999', marginTop: '0.25rem' }}>
          P(hit|AC) × P(fail save|damage) across {scenarioResults.length} real combat encounters — {buildSummaries.length} builds evaluated
        </p>
      </div>

      {/* ── TAB BAR ── */}
      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: '1.5rem',
        borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem',
        flexWrap: 'wrap',
      }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0', border: 'none',
              background: activeTab === tab.id ? 'var(--surface-light)' : 'transparent',
              color: activeTab === tab.id ? 'var(--accent-gold)' : '#888',
              fontWeight: activeTab === tab.id ? 700 : 400,
              cursor: 'pointer', fontSize: '0.9rem',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-gold)' : '2px solid transparent',
              transition: 'all 0.2s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      {activeTab === 'overview' && <OverviewTab data={data} navigate={navigate} />}
      {activeTab === 'scenarios' && (
        <ScenariosTab
          data={data}
          selectedScenario={selectedScenario}
          setSelectedScenario={setSelectedScenario}
          expandedBuild={expandedBuild}
          setExpandedBuild={setExpandedBuild}
          navigate={navigate}
        />
      )}
      {activeTab === 'iron' && <IronTab data={data} />}
      {activeTab === 'party' && <PartyTab data={data} navigate={navigate} />}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// OVERVIEW TAB — Build Rankings Across All Scenarios
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({ data, navigate }) {
  const { buildSummaries } = data;

  return (
    <div>
      <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>
        🏆 Overall Build Rankings — Average Score Across All 8 Scenarios
      </h3>

      <div className="table-container" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '2.5rem' }}>#</th>
              <th>Build</th>
              <th>Species</th>
              <th style={{ width: '4rem' }}>Avg</th>
              <th style={{ width: '4rem' }}>AC</th>
              <th style={{ width: '4rem' }}>DC</th>
              <th style={{ width: '5rem' }}>CON</th>
              <th style={{ width: '5rem' }}>Conc%</th>
              <th>Best Scenario</th>
              <th>Worst Scenario</th>
              <th>Special</th>
            </tr>
          </thead>
          <tbody>
            {buildSummaries.map((b, i) => {
              const specials = [];
              if (b.canFly) specials.push(flyIcon(true, b.flyType));
              if (b.magicRes) specials.push('🛡MR');
              if (b.advCon) specials.push('⚡ADV');
              if (b.hiddenStep) specials.push('👻');
              if (b.dragonFear) specials.push('🐉');

              return (
                <tr key={b.buildId}
                  onClick={() => navigate(`/builds/${b.buildId}`)}
                  style={{ cursor: 'pointer' }}
                  className="clickable-row"
                >
                  <td style={{ color: i < 3 ? 'var(--accent-gold)' : '#888', fontWeight: 700 }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                  </td>
                  <td style={{ fontWeight: 600 }}>{b.name}</td>
                  <td style={{ color: '#aaa' }}>{b.species}</td>
                  <td style={{ color: scoreColor(b.avgScore), fontWeight: 700 }}>{b.avgScore}</td>
                  <td>{b.ac}</td>
                  <td style={{ color: b.dc >= 17 ? 'var(--accent-gold)' : 'inherit' }}>{b.dc}</td>
                  <td>+{b.conSave}{b.advCon ? ' (adv)' : ''}</td>
                  <td style={{ color: concColor(b.concentrationHoldPct) }}>{b.concentrationHoldPct}%</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--accent-green)' }}>{b.best.scenario}</span>
                    <span style={{ color: '#666', marginLeft: '0.3rem' }}>{b.best.score}</span>
                  </td>
                  <td style={{ fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--accent-red)' }}>{b.worst.scenario}</span>
                    <span style={{ color: '#666', marginLeft: '0.3rem' }}>{b.worst.score}</span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{specials.join(' ')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Score distribution insight */}
      <div style={{
        marginTop: '1.5rem', padding: '1rem', background: 'var(--surface-light)',
        borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
      }}>
        <h4 style={{ marginBottom: '0.5rem', color: 'var(--accent-blue)' }}>📈 Score Breakdown</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
          <div>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>Score Formula:</span>
            <div style={{ fontSize: '0.85rem', color: '#ccc', marginTop: '0.25rem' }}>
              30% CC Effectiveness + 30% Concentration (3 rounds) + 15% Survivability + 15% Counter Risk + 10% Disable Risk
            </div>
          </div>
          <div>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>Top Build:</span>
            <div style={{ fontSize: '0.95rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
              {buildSummaries[0]?.name} — {buildSummaries[0]?.avgScore}
            </div>
          </div>
          <div>
            <span style={{ color: '#888', fontSize: '0.8rem' }}>Score Range:</span>
            <div style={{ fontSize: '0.95rem', color: '#ccc' }}>
              {buildSummaries[buildSummaries.length - 1]?.avgScore} – {buildSummaries[0]?.avgScore}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// SCENARIOS TAB — Per-Scenario Deep Dive
// ═══════════════════════════════════════════════════════════════════════════

function ScenariosTab({ data, selectedScenario, setSelectedScenario, expandedBuild, setExpandedBuild, navigate }) {
  const { scenarioResults } = data;
  const active = scenarioResults.find(s => s.id === selectedScenario) || scenarioResults[0];

  return (
    <div>
      {/* Scenario selector */}
      <div style={{
        display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap',
      }}>
        {scenarioResults.map(s => (
          <button
            key={s.id}
            onClick={() => { setSelectedScenario(s.id); setExpandedBuild(null); }}
            style={{
              padding: '0.5rem 0.75rem', borderRadius: '6px',
              border: selectedScenario === s.id ? '1px solid var(--accent-gold)' : '1px solid rgba(255,255,255,0.15)',
              background: selectedScenario === s.id ? 'rgba(212,168,75,0.15)' : 'var(--surface-light)',
              color: selectedScenario === s.id ? 'var(--accent-gold)' : '#aaa',
              cursor: 'pointer', fontSize: '0.85rem', fontWeight: selectedScenario === s.id ? 600 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Scenario info */}
      {active && (
        <>
          <div style={{
            padding: '1rem', background: 'var(--surface-light)', borderRadius: '8px',
            marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{active.name}</div>
            <div style={{ color: '#aaa', marginTop: '0.25rem' }}>{active.desc}</div>
            <div style={{ color: '#888', marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <strong>Foes:</strong> {active.foesSummary} &nbsp;|&nbsp; <strong>Rounds:</strong> {active.rounds}
            </div>
            <div style={{ color: 'var(--accent-blue)', marginTop: '0.25rem', fontSize: '0.85rem', fontStyle: 'italic' }}>
              {active.notes}
            </div>
          </div>

          {/* Rankings table */}
          <div className="table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '2.5rem' }}>#</th>
                  <th>Build</th>
                  <th style={{ width: '4rem' }}>Score</th>
                  <th style={{ width: '4rem' }}>CC%</th>
                  <th style={{ width: '5rem' }}>Conc 3R</th>
                  <th style={{ width: '5rem' }}>Conc 5R</th>
                  <th style={{ width: '3.5rem' }}>HP</th>
                  <th style={{ width: '3rem' }}>AC</th>
                  <th style={{ width: '3rem' }}>DC</th>
                  <th style={{ width: '3.5rem' }}>Fly</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {active.rankings.map((r, i) => (
                  <>
                    <tr
                      key={r.buildId}
                      onClick={() => setExpandedBuild(expandedBuild === r.buildId ? null : r.buildId)}
                      style={{ cursor: 'pointer' }}
                      className="clickable-row"
                    >
                      <td style={{ color: i < 3 ? 'var(--accent-gold)' : '#888', fontWeight: 700 }}>
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.build}</td>
                      <td style={{ color: scoreColor(r.score), fontWeight: 700 }}>{r.score}</td>
                      <td style={{ color: concColor(r.ccPct) }}>{r.ccPct}%</td>
                      <td style={{ color: concColor(r.conc3Rounds) }}>{r.conc3Rounds}%</td>
                      <td style={{ color: concColor(r.conc5Rounds) }}>{r.conc5Rounds}%</td>
                      <td style={{ color: r.hpAfter5 <= 0 ? 'var(--accent-red)' : '#ccc' }}>{r.hpAfter5}</td>
                      <td>{r.AC}</td>
                      <td style={{ color: r.DC >= 17 ? 'var(--accent-gold)' : 'inherit' }}>{r.DC}</td>
                      <td>{flyIcon(r.canFly, r.flyType)}</td>
                      <td style={{ fontSize: '0.8rem', color: '#aaa' }}>{r.notes.slice(0, 2).join(' | ')}</td>
                    </tr>
                    {expandedBuild === r.buildId && (
                      <tr key={`${r.buildId}-detail`}>
                        <td colSpan={11} style={{ padding: 0 }}>
                          <RoundLog result={r} navigate={navigate} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function RoundLog({ result: r, navigate }) {
  const hasRoundLog = r.roundLog && r.roundLog.length > 0;
  const hasCombatSummary = r.combatSummary && r.combatSummary.length > 0;

  return (
    <div style={{
      padding: '1rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h4 style={{ color: 'var(--accent-blue)', margin: 0 }}>
          {hasCombatSummary ? '⚔️ Combat Summary' : 'Round-by-Round'}: {r.build}
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/combat-logs/${r.buildId}/${r.scenarioId}`); }}
            style={{
              padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem',
              background: 'var(--accent-gold)', color: '#000', border: 'none', cursor: 'pointer',
            }}
          >
            📜 View Combat Log
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/builds/${r.buildId}`); }}
            style={{
              padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem',
              background: 'var(--accent-blue)', color: '#fff', border: 'none', cursor: 'pointer',
            }}
          >
            View Build →
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#888' }}>
        <span>AC {r.AC}</span> · <span>DC {r.DC}</span> · <span>CON +{r.conSave}{r.advCon ? ' (adv)' : ''}</span> ·
        <span>HP {r.hp}</span>
        {r.canFly && <> · <span>{flyIcon(true, r.flyType)} Turn {r.flyTurn}</span></>}
        {r.magicRes && <> · <span>🛡 Magic Resistance</span></>}
        {r.hiddenStep && <> · <span>👻 Hidden Step</span></>}
      </div>

      {/* Simulation stats banner */}
      {r.simulations && (
        <div style={{
          display: 'flex', gap: '1.5rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem',
          background: 'rgba(255,255,255,0.04)', borderRadius: '6px', fontSize: '0.85rem',
        }}>
          <span style={{ color: 'var(--accent-green)' }}>✅ {r.victories || 0}W</span>
          <span style={{ color: 'var(--accent-red)' }}>❌ {r.defeats || 0}L</span>
          <span style={{ color: '#888' }}>⏸ {r.stalemates || 0}S</span>
          <span style={{ color: '#aaa' }}>⏱ Avg {(r.avgRounds || 0).toFixed?.(1) || r.avgRounds} rounds</span>
          <span style={{ color: r.avgHPPct >= 50 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
            ❤️ {r.avgHPPct || 0}% HP remaining
          </span>
        </div>
      )}

      {/* New: Combat engine per-combatant summary */}
      {hasCombatSummary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
          {r.combatSummary.map((c, i) => {
            const hpPct = c.maxHP > 0 ? Math.round((c.finalHP / c.maxHP) * 100) : 0;
            const isParty = c.side === 'party';
            return (
              <div key={i} style={{
                padding: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px',
                border: `1px solid ${isParty ? 'rgba(74,158,255,0.2)' : 'rgba(255,100,100,0.2)'}`,
              }}>
                <div style={{
                  fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.3rem',
                  color: isParty ? 'var(--accent-blue)' : '#e88',
                }}>
                  {isParty ? '🎵' : '💀'} {c.name} {c.alive ? '' : '☠️'}
                </div>
                <Bar value={c.finalHP} max={c.maxHP}
                  color={c.alive ? 'var(--accent-green)' : 'var(--accent-red)'}
                  label="HP" />
                <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.25rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {c.damageDealt > 0 && <span>⚔️{c.damageDealt} dmg dealt</span>}
                  {c.damageTaken > 0 && <span>🛡{c.damageTaken} taken</span>}
                  {c.spellsCast > 0 && <span>✨{c.spellsCast} spells</span>}
                  {c.conditionsInflicted > 0 && <span>🎯{c.conditionsInflicted} CC</span>}
                  {c.attacksMade > 0 && <span>{c.attacksHit}/{c.attacksMade} hits</span>}
                </div>
                {c.conditions && c.conditions.length > 0 && (
                  <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '0.2rem' }}>
                    {c.conditions.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Old: per-round log */}
      {hasRoundLog && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
          {r.roundLog.map(round => (
            <div key={round.round} style={{
              padding: '0.5rem', background: 'rgba(255,255,255,0.04)', borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>
                Round {round.round}
                {round.flying && ' ✈️'}
                {round.invisible && ' 👻'}
              </div>
              <Bar value={round.concCumulative} color={concColor(round.concCumulative)} label="Conc" />
              <div style={{ marginTop: '0.25rem' }}>
                <Bar value={round.hpRemaining} max={r.hp} color={round.hpRemaining <= 0 ? 'var(--accent-red)' : 'var(--accent-green)'} label="HP" />
              </div>
              <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                -{round.dmgThisRound} dmg
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fallback: no detail data available */}
      {!hasRoundLog && !hasCombatSummary && (
        <div style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic' }}>
          No detailed combat data available. Re-run simulations to generate.
        </div>
      )}

      {r.notes && r.notes.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          {r.notes.map((n, i) => (
            <div key={i} style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.15rem' }}>{n}</div>
          ))}
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// IRON TAB — Iron Concentration vs Armored Comparison
// ═══════════════════════════════════════════════════════════════════════════

function IronTab({ data }) {
  const { ironComparison } = data;

  if (!ironComparison || ironComparison.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
        No Iron Concentration vs Armored comparison data available. Need builds named "Iron Concentration" / "Flying Fortress" and "Standard Tank" / "Unkillable Wall" / "Double CC" / "Full Package".
      </div>
    );
  }

  const ironWins = ironComparison.filter(c => c.winner === 'IRON').length;
  const armoredWins = ironComparison.filter(c => c.winner === 'ARMORED').length;
  const ties = ironComparison.filter(c => c.winner === 'TIE').length;

  return (
    <div>
      <h3 style={{ marginBottom: '0.5rem', color: 'var(--accent-gold)' }}>
        🛡️ The Iron Concentration Question
      </h3>
      <p style={{ color: '#999', marginBottom: '1rem' }}>
        AC 13 + 99.8% save &nbsp;vs&nbsp; AC 19-20 + 91% save — which one actually holds concentration better in real combat?
      </p>

      {/* Overall verdict */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', marginBottom: '1.5rem',
        padding: '1rem', background: 'var(--surface-light)', borderRadius: '8px',
        border: '1px solid rgba(255,255,255,0.1)', alignItems: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: ironWins > armoredWins ? 'var(--accent-green)' : '#888' }}>
            {ironWins}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Iron Wins</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '1.2rem', color: '#666' }}>
          {ties > 0 ? `${ties} tie${ties > 1 ? 's' : ''}` : 'vs'}
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: armoredWins > ironWins ? 'var(--accent-green)' : '#888' }}>
            {armoredWins}
          </div>
          <div style={{ color: '#aaa', fontSize: '0.85rem' }}>Armored Wins</div>
        </div>
      </div>

      {/* Per-scenario comparison */}
      {ironComparison.map(c => (
        <div key={c.scenarioId} style={{
          padding: '0.75rem 1rem', marginBottom: '0.5rem',
          background: 'var(--surface-light)', borderRadius: '8px',
          border: `1px solid ${c.winner === 'IRON' ? 'rgba(74,222,128,0.3)' : c.winner === 'ARMORED' ? 'rgba(74,158,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontWeight: 600 }}>{c.scenario}</span>
            <span style={{
              padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
              background: c.winner === 'IRON' ? 'rgba(74,222,128,0.2)' : c.winner === 'ARMORED' ? 'rgba(74,158,255,0.2)' : 'rgba(255,255,255,0.1)',
              color: c.winner === 'IRON' ? 'var(--accent-green)' : c.winner === 'ARMORED' ? 'var(--accent-blue)' : '#888',
            }}>
              {c.winner} +{c.diff}%
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
            <div style={{ borderLeft: '3px solid var(--accent-green)', paddingLeft: '0.5rem' }}>
              <div style={{ color: '#aaa', fontSize: '0.75rem' }}>Iron</div>
              <div style={{ fontWeight: 600 }}>{c.iron.build}</div>
              <div style={{ color: '#888' }}>
                AC {c.iron.ac} · Conc 3R: <span style={{ color: concColor(c.iron.conc3) }}>{c.iron.conc3}%</span> · 5R: {c.iron.conc5}% · HP: {c.iron.hp}
              </div>
            </div>
            <div style={{ borderLeft: '3px solid var(--accent-blue)', paddingLeft: '0.5rem' }}>
              <div style={{ color: '#aaa', fontSize: '0.75rem' }}>Armored</div>
              <div style={{ fontWeight: 600 }}>{c.armored.build}</div>
              <div style={{ color: '#888' }}>
                AC {c.armored.ac} · Conc 3R: <span style={{ color: concColor(c.armored.conc3) }}>{c.armored.conc3}%</span> · 5R: {c.armored.conc5}% · HP: {c.armored.hp}
              </div>
            </div>
          </div>
        </div>
      ))}

      <div style={{
        marginTop: '1.5rem', padding: '1rem', background: 'rgba(212,168,75,0.1)',
        borderRadius: '8px', border: '1px solid rgba(212,168,75,0.3)',
      }}>
        <h4 style={{ color: 'var(--accent-gold)', marginBottom: '0.5rem' }}>💡 Key Insight</h4>
        <p style={{ color: '#ccc', fontSize: '0.9rem', lineHeight: 1.5 }}>
          {ironWins > armoredWins
            ? `Iron Concentration wins ${ironWins}/${ironComparison.length} scenarios. The math-perfect save (99.8%) beats high AC in most real encounters because: (1) you only need to SURVIVE hits, not avoid them, (2) concentration DC 10 is trivial with War Caster + Resilient CON + Luckstone, and (3) flight makes AC less relevant against melee-heavy encounters.`
            : armoredWins > ironWins
            ? `Armored builds win ${armoredWins}/${ironComparison.length} scenarios. High AC prevents hits entirely, which prevents BOTH concentration checks AND HP damage. Against high-damage enemies, not getting hit at all is better than having a great save.`
            : `It's a close split! The answer depends on encounter type. Iron wins against many small attacks (each does DC 10). Armored wins against few massive attacks where AC prevents devastating single hits.`
          }
        </p>
      </div>
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════
// PARTY TAB — Party Composition Analysis
// ═══════════════════════════════════════════════════════════════════════════

function PartyTab({ data, navigate }) {
  const { partyAnalysis } = data;

  return (
    <div>
      <h3 style={{ marginBottom: '1rem', color: 'var(--accent-gold)' }}>
        🤝 Party Composition Recommendations
      </h3>
      <p style={{ color: '#999', marginBottom: '1.5rem' }}>
        What each build brings to the party and what it needs from allies.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {partyAnalysis.map(a => (
          <div key={a.buildId} style={{
            padding: '1rem', background: 'var(--surface-light)', borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem',
            }}>
              <span
                style={{ fontSize: '1rem', fontWeight: 600, cursor: 'pointer', color: 'var(--accent-blue)' }}
                onClick={() => navigate(`/builds/${a.buildId}`)}
              >
                {a.build}
              </span>
            </div>

            {a.strengths.length > 0 && (
              <div style={{ marginBottom: '0.4rem' }}>
                {a.strengths.map((s, i) => (
                  <span key={i} style={{
                    display: 'inline-block', padding: '0.15rem 0.5rem', marginRight: '0.3rem',
                    marginBottom: '0.3rem', borderRadius: '4px', fontSize: '0.8rem',
                    background: 'rgba(74,222,128,0.1)', color: 'var(--accent-green)',
                    border: '1px solid rgba(74,222,128,0.2)',
                  }}>
                    ✅ {s}
                  </span>
                ))}
              </div>
            )}

            {a.weaknesses.length > 0 && (
              <div style={{ marginBottom: '0.4rem' }}>
                {a.weaknesses.map((w, i) => (
                  <span key={i} style={{
                    display: 'inline-block', padding: '0.15rem 0.5rem', marginRight: '0.3rem',
                    marginBottom: '0.3rem', borderRadius: '4px', fontSize: '0.8rem',
                    background: 'rgba(239,68,68,0.1)', color: 'var(--accent-red)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}>
                    ❌ {w}
                  </span>
                ))}
              </div>
            )}

            {a.partyNeeds.length > 0 && (
              <div style={{ marginBottom: '0.4rem' }}>
                {a.partyNeeds.map((n, i) => (
                  <span key={i} style={{
                    display: 'inline-block', padding: '0.15rem 0.5rem', marginRight: '0.3rem',
                    marginBottom: '0.3rem', borderRadius: '4px', fontSize: '0.8rem',
                    background: 'rgba(74,158,255,0.1)', color: 'var(--accent-blue)',
                    border: '1px solid rgba(74,158,255,0.2)',
                  }}>
                    🎯 {n}
                  </span>
                ))}
              </div>
            )}

            <div style={{
              marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.03)',
              borderRadius: '4px', fontSize: '0.85rem', color: '#aaa',
            }}>
              🤝 <strong>Best party comp:</strong> {a.bestWith}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
