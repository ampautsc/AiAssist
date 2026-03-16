/**
 * LiveCombatPage.jsx
 *
 * Orchestrates live stepped-dice combat sessions.
 *
 * Flow:
 *   1. Create session from encounter config
 *   2. Show turn menu for active combatant
 *   3. When action submitted (stepped), display DiceArena per-die
 *   4. DiceArena yields seeds → send to server via provideDice()
 *   5. If more dice needed, repeat; if done, show result and advance
 *   6. Show combat log and combatant panel throughout
 */

import { useState, useCallback } from 'react'
import { useCombatSession } from '../combat/useCombatSession'
import DiceArena from '../components/DiceArena'

// ── Quick encounter setup — for now a hardcoded test encounter ──────────────
const TEST_ENCOUNTER = {
  party: ['bard1'],
  enemies: ['brute1'],
  terrain: { width: 10, height: 10 },
}

export default function LiveCombatPage() {
  const session = useCombatSession()
  const [setupConfig, setSetupConfig] = useState(null)
  const [showDice, setShowDice] = useState(false)

  // ── Create Session ──────────────────────────────────────────────────

  const handleCreateSession = useCallback(async () => {
    try {
      await session.createSession(TEST_ENCOUNTER)
    } catch (err) {
      console.error('Failed to create session:', err)
    }
  }, [session.createSession])

  // ── Submit Action (stepped) ─────────────────────────────────────────

  const handleActionChoice = useCallback(async (choice) => {
    try {
      const result = await session.submitActionStepped(choice)
      if (!result.done) {
        // Dice needed — show DiceArena
        setShowDice(true)
      }
    } catch (err) {
      console.error('Action failed:', err)
    }
  }, [session.submitActionStepped])

  // ── DiceArena completes — send seeds to server ──────────────────────

  const handleDiceComplete = useCallback(async (seeds) => {
    try {
      const isAi = session.ownerIsAi
      const diceData = isAi
        ? { auto: true }
        : { seeds }

      const result = await session.provideDice(diceData)

      if (result.done) {
        // Action fully resolved — hide dice
        setShowDice(false)
      }
      // If not done, pendingDice state updates and DiceArena re-renders
      // with the new dice request automatically
    } catch (err) {
      console.error('Dice submission failed:', err)
      setShowDice(false)
    }
  }, [session.provideDice, session.ownerIsAi])

  // ── Cancel dice / back to menu ──────────────────────────────────────

  const handleDiceCancel = useCallback(() => {
    setShowDice(false)
    // Note: server still has pending context. Next action will overwrite it.
  }, [])

  // ── End Turn ────────────────────────────────────────────────────────

  const handleEndTurn = useCallback(async () => {
    try {
      await session.endTurn()
    } catch (err) {
      console.error('End turn failed:', err)
    }
  }, [session.endTurn])

  // ── RENDER ──────────────────────────────────────────────────────────

  // Setup screen
  if (session.status === 'idle') {
    return (
      <div style={S.page}>
        <h2 style={S.heading}>Live Combat</h2>
        <p style={S.subtext}>Start a new combat encounter with stepped dice rolling.</p>
        <button onClick={handleCreateSession} style={S.primaryBtn}>
          Start Test Encounter
        </button>
      </div>
    )
  }

  // Victory screen
  if (session.status === 'complete') {
    return (
      <div style={S.page}>
        <h2 style={S.heading}>Combat Complete!</h2>
        <div style={S.victoryCard}>
          <p>{session.victory?.message || 'The encounter has ended.'}</p>
        </div>
        <div style={S.logPanel}>
          <h3 style={S.logTitle}>Combat Log</h3>
          {session.combatLog.map((entry, i) => (
            <div key={i} style={S.logEntry}>{entry}</div>
          ))}
        </div>
        <button onClick={session.destroySession} style={S.secondaryBtn}>
          Back to Setup
        </button>
      </div>
    )
  }

  // Active combat
  const combatants = session.gameState?.combatants || []
  const activeActor = combatants.find(c => c.id === session.activeId)
  const isPlayerTurn = activeActor?.side === 'party'
  const menuOptions = session.menu?.actions || []
  const bonusActions = session.menu?.bonusActions || []
  const movements = session.menu?.movements || []

  return (
    <div style={S.page}>
      {/* DiceArena overlay (stepped per-die-click mode) */}
      <DiceArena
        visible={showDice && !!session.pendingDice}
        pendingDice={session.pendingDice}
        ownerIsAi={session.ownerIsAi}
        onDiceComplete={handleDiceComplete}
        onCancel={handleDiceCancel}
      />

      {/* Round / Turn Header */}
      <div style={S.header}>
        <span style={S.roundBadge}>Round {session.round}</span>
        <span style={S.turnLabel}>
          {session.activeName || session.activeId}'s Turn
          {session.isResolving && ' — Resolving...'}
        </span>
      </div>

      {/* Combatant Panel */}
      <div style={S.combatantPanel}>
        {combatants.map(c => (
          <div
            key={c.id}
            style={{
              ...S.combatantCard,
              ...(c.id === session.activeId ? S.activeCard : {}),
              ...(c.currentHP <= 0 ? S.deadCard : {}),
            }}
          >
            <div style={S.combatantName}>{c.name}</div>
            <div style={S.hpBar}>
              <div
                style={{
                  ...S.hpFill,
                  width: `${Math.max(0, (c.currentHP / c.maxHP) * 100)}%`,
                  background: c.side === 'party' ? '#4fc3f7' : '#e57373',
                }}
              />
            </div>
            <div style={S.hpText}>
              {c.currentHP}/{c.maxHP} HP | AC {c.ac}
            </div>
            {(c.conditions || []).length > 0 && (
              <div style={S.conditions}>
                {c.conditions.map((cond, i) => (
                  <span key={i} style={S.condBadge}>{cond}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Menu (player turn only) */}
      {isPlayerTurn && !showDice && !session.isResolving && (
        <div style={S.menuPanel}>
          <h3 style={S.menuTitle}>Actions</h3>
          <div style={S.menuGrid}>
            {menuOptions.map(opt => (
              <button
                key={opt.optionId}
                onClick={() => handleActionChoice({ optionId: opt.optionId })}
                style={S.actionBtn}
                title={opt.description || opt.type}
              >
                <div style={S.actionName}>{opt.label || opt.weaponName || opt.spellName || opt.type}</div>
                {opt.targetName && <div style={S.actionTarget}>→ {opt.targetName}</div>}
              </button>
            ))}
          </div>

          {bonusActions.length > 0 && (
            <>
              <h3 style={S.menuTitle}>Bonus Actions</h3>
              <div style={S.menuGrid}>
                {bonusActions.map(opt => (
                  <button
                    key={opt.optionId}
                    onClick={() => handleActionChoice({ optionId: opt.optionId })}
                    style={S.bonusBtn}
                  >
                    {opt.label || opt.type}
                  </button>
                ))}
              </div>
            </>
          )}

          <button onClick={handleEndTurn} style={S.endTurnBtn}>
            End Turn
          </button>
        </div>
      )}

      {/* AI Turn indicator */}
      {!isPlayerTurn && !session.isResolving && (
        <div style={S.aiPanel}>
          <div style={S.aiLabel}>Enemy Turn — {session.activeName}</div>
          <p style={S.subtext}>AI will act automatically...</p>
        </div>
      )}

      {/* Last Action Result */}
      {session.lastResult && (
        <div style={S.resultPanel}>
          <div style={S.resultTitle}>Last Action</div>
          <div style={S.resultBody}>
            {session.lastResult.type === 'attack' && (
              <span>
                {session.lastResult.hit ? '✅ Hit' : '❌ Miss'}
                {session.lastResult.hit && ` — ${session.lastResult.damage} damage`}
                {session.lastResult.crit && ' (CRIT!)'}
              </span>
            )}
            {session.lastResult.type === 'multiattack' && (
              <span>
                Multiattack: {session.lastResult.totalHits}/{session.lastResult.attackCount} hits,{' '}
                {session.lastResult.totalDamage} total damage
              </span>
            )}
          </div>
        </div>
      )}

      {/* Combat Log */}
      <div style={S.logPanel}>
        <h3 style={S.logTitle}>Combat Log</h3>
        <div style={S.logScroll}>
          {session.combatLog.slice(-20).map((entry, i) => (
            <div key={i} style={S.logEntry}>{entry}</div>
          ))}
        </div>
      </div>

      {session.error && (
        <div style={S.errorBar}>{session.error}</div>
      )}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  page: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '1.5rem',
    color: '#f3f3ff',
  },
  heading: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: '0.5rem',
  },
  subtext: {
    opacity: 0.7,
    marginBottom: '1rem',
  },

  // Header
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
  },
  roundBadge: {
    background: '#e94560',
    color: '#fff',
    padding: '4px 12px',
    borderRadius: 6,
    fontWeight: 700,
    fontSize: 14,
  },
  turnLabel: {
    fontSize: 18,
    fontWeight: 600,
  },

  // Combatant panel
  combatantPanel: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap',
    marginBottom: '1.5rem',
  },
  combatantCard: {
    flex: '1 1 200px',
    background: 'rgba(22, 33, 62, 0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '0.75rem',
    transition: 'all 0.2s',
  },
  activeCard: {
    borderColor: '#e94560',
    boxShadow: '0 0 12px rgba(233, 69, 96, 0.3)',
  },
  deadCard: {
    opacity: 0.4,
  },
  combatantName: {
    fontWeight: 700,
    marginBottom: 4,
  },
  hpBar: {
    height: 6,
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  hpFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  hpText: {
    fontSize: 11,
    opacity: 0.8,
  },
  conditions: {
    display: 'flex',
    gap: 4,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  condBadge: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(233, 69, 96, 0.3)',
    border: '1px solid rgba(233, 69, 96, 0.5)',
  },

  // Action menu
  menuPanel: {
    background: 'rgba(22, 33, 62, 0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '1rem',
    marginBottom: '1rem',
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: '0.5rem',
    opacity: 0.8,
  },
  menuGrid: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap',
    marginBottom: '0.75rem',
  },
  actionBtn: {
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid rgba(79, 195, 247, 0.4)',
    background: 'rgba(79, 195, 247, 0.1)',
    color: '#f3f3ff',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s',
  },
  bonusBtn: {
    padding: '6px 12px',
    borderRadius: 6,
    border: '1px solid rgba(255, 183, 77, 0.4)',
    background: 'rgba(255, 183, 77, 0.1)',
    color: '#f3f3ff',
    cursor: 'pointer',
    fontSize: 13,
  },
  actionName: {
    fontWeight: 600,
    fontSize: 14,
  },
  actionTarget: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  endTurnBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'rgba(255,255,255,0.05)',
    color: '#f3f3ff',
    cursor: 'pointer',
    fontWeight: 600,
  },

  // AI panel
  aiPanel: {
    textAlign: 'center',
    padding: '2rem',
    background: 'rgba(22, 33, 62, 0.6)',
    borderRadius: 10,
    marginBottom: '1rem',
  },
  aiLabel: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 4,
  },

  // Result panel
  resultPanel: {
    background: 'rgba(22, 33, 62, 0.6)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
  },
  resultTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
    marginBottom: 4,
  },
  resultBody: {
    fontSize: 15,
    fontWeight: 600,
  },

  // Combat log
  logPanel: {
    background: 'rgba(22, 33, 62, 0.4)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: '0.75rem 1rem',
    marginBottom: '1rem',
  },
  logTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    opacity: 0.6,
    marginBottom: '0.5rem',
  },
  logScroll: {
    maxHeight: 200,
    overflowY: 'auto',
  },
  logEntry: {
    fontSize: 12,
    padding: '2px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    opacity: 0.85,
  },

  // Buttons
  primaryBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    border: 'none',
    background: '#e94560',
    color: '#fff',
    fontWeight: 700,
    fontSize: 16,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '8px 16px',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.3)',
    background: 'transparent',
    color: '#f3f3ff',
    cursor: 'pointer',
  },
  victoryCard: {
    background: 'rgba(60, 180, 80, 0.15)',
    border: '1px solid rgba(60, 180, 80, 0.4)',
    borderRadius: 10,
    padding: '1rem 1.5rem',
    marginBottom: '1rem',
    fontSize: 16,
  },
  errorBar: {
    background: 'rgba(233, 69, 96, 0.2)',
    border: '1px solid rgba(233, 69, 96, 0.5)',
    borderRadius: 8,
    padding: '8px 12px',
    color: '#ff8a80',
    fontSize: 13,
  },
}
