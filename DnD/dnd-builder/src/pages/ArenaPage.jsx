import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

// ─── ARENA LOGIC ────────────────────────────────────────────────────────────

// Species innate power that feats/items can't buy
const SPECIES_POWER = {
  'Firbolg':          { offense: 3, defense: 8, social: 9, unique: 9, desc: 'Hidden Step (invisible BA, not a spell, PB/LR). Free Disguise Self + Detect Magic. Beast/plant speech.' },
  'Eladrin':          { offense: 9, defense: 5, social: 7, unique: 8, desc: 'Fey Step teleport + Autumn charm 2 creatures (not conc, not a spell). Fey type.' },
  'Gem Dragonborn':   { offense: 7, defense: 4, social: 6, unique: 7, desc: 'Breath weapon AoE, hover flight, 30ft telepathy. Dragon Fear available.' },
  'Satyr':            { offense: 2, defense: 10, social: 5, unique: 9, desc: 'Magic Resistance (adv on ALL spell saves). Fey type (immune to humanoid-targeting). 35ft speed.' },
  'Yuan-Ti':          { offense: 4, defense: 10, social: 7, unique: 8, desc: 'Magic Resistance + Poison Immunity. Free Suggestion 1/LR.' },
  'Custom Lineage':   { offense: 3, defense: 2, social: 2, unique: 4, desc: 'Extra feat at Lv1 (3 total by Lv8). No innate abilities. Pure feat math.' },
  'Tortle':           { offense: 1, defense: 8, social: 1, unique: 6, desc: 'Natural AC 17 (no armor needed). Shell Defense +4 AC emergency. Frees feat slots from Mod Armored.' },
};

// What matters for a Lore Bard, weighted
const WEIGHTS = {
  spellDc:         20,  // Your spells landing is everything
  concentrationHold: 18, // Useless if your spell drops
  speciesDefense:  14,  // Innate survivability (Magic Resist, Hidden Step, Fey type)
  speciesOffense:  12,  // Free CC/damage that doesn't cost spell slots
  speciesSocial:   10,  // Social pillar strength
  speciesUnique:   8,   // How irreplaceable are your species features?
  ac:              8,   // AC matters but Bards aren't front-liners
  versatility:     6,   // Can you handle unexpected situations?
  fun:             4,   // Subjective but real
};

function scoreBuild(build) {
  const sp = SPECIES_POWER[build.species?.name] || { offense: 3, defense: 3, social: 3, unique: 3 };

  // Normalize values to 0-10 scale
  const dcScore = Math.min(10, (build.spellDc - 13) * 2.5);        // DC 15=5, DC 16=7.5, DC 17=10
  const concScore = Math.min(10, (build.concentrationHoldPct - 50) / 5); // 50%=0, 100%=10
  const acScore = Math.min(10, (build.finalAc - 12) * 1.25);       // AC 12=0, AC 20=10
  const funScore = build.ratings?.fun || 5;
  
  // Versatility: builds with both decent DC AND decent conc score higher
  const dcNorm = dcScore / 10;
  const concNorm = concScore / 10;
  const versatility = (Math.min(dcNorm, concNorm) * 2 + (dcNorm + concNorm) / 2) / 2.5 * 10;

  const raw = {
    spellDc: dcScore,
    concentrationHold: concScore,
    speciesDefense: sp.defense,
    speciesOffense: sp.offense,
    speciesSocial: sp.social,
    speciesUnique: sp.unique,
    ac: acScore,
    versatility: versatility,
    fun: funScore,
  };

  let total = 0;
  let maxPossible = 0;
  for (const [key, weight] of Object.entries(WEIGHTS)) {
    total += (raw[key] || 0) * weight;
    maxPossible += 10 * weight;
  }

  return { raw, total, maxPossible, pct: Math.round(total / maxPossible * 100) };
}

// Head-to-head matchup commentary
function getMatchupVerdict(winner, runnerUp) {
  const wName = winner.species?.name;
  const rName = runnerUp.species?.name;
  
  const verdicts = {
    'Firbolg': {
      over: {
        'Eladrin': 'Hidden Step is the ultimate "nope" button. Invisible without concentration, without a spell, without being counterable. Eladrin charms rooms, but Firbolg just... vanishes.',
        'Gem Dragonborn': 'The dragon has more tools, but none of them say "I\'m untargetable now." Hidden Step is worth more than breath weapons + flight combined on a Bard.',
        'Satyr': 'Magic Resistance is incredible, but it\'s passive. Hidden Step is proactive — you choose when to become invisible. Firbolg controls the fight; Satyr just survives it.',
        'Yuan-Ti': 'Snake has the best defensive package in the game. But Firbolg gets free Disguise Self + Detect Magic + invisible escape + beast speech. Yuan-Ti gets... free Suggestion. One trick vs a Swiss army knife.',
        'Custom Lineage': 'Three feats can\'t buy what Hidden Step gives for free. Custom Lineage is the min-maxer\'s choice, Firbolg is the player\'s choice.',
        'Tortle': 'Shell is durable, but it\'s a turtle. Firbolg has a complete social toolkit, invisibility, and the same spell list. No contest in the social pillar.',
      }
    },
    'Eladrin': {
      over: {
        'Gem Dragonborn': 'Fey Step + Autumn charm = two CC effects in one turn. Dragon has more tools but Eladrin\'s action economy is unmatched.',
        'Satyr': 'Both are Fey type, but Eladrin teleports AND charms. Satyr just... jumps high.',
        'Yuan-Ti': 'Eladrin\'s Autumn charm is not concentration, not a spell, charms TWO creatures. Yuan-Ti\'s free Suggestion IS a spell, targets ONE. Action economy wins.',
        'Custom Lineage': 'An extra feat can\'t replicate a PB/LR teleport with charm rider.',
        'Tortle': 'Fey Step alone is worth more than Natural Armor when you\'re a full caster.',
      }
    }
  };

  return verdicts[wName]?.over?.[rName] || null;
}

// ─── ROUND DESCRIPTIONS ─────────────────────────────────────────────────────

function getRoundAnalysis(builds, round) {
  const sorted = [...builds].sort((a, b) => b.arenaScore.pct - a.arenaScore.pct);
  
  const rounds = [
    {
      title: '🏟️ Round 1 — The Cull',
      subtitle: '21 bards enter. The pretenders are exposed.',
      narrative: `The arena floor is crowded. 21 bards, all wielding the same spell list, all claiming mastery of the College of Lore.

The first test is simple: **cast Hypnotic Pattern and hold it.**

The glass cannons with DC 17 but 55-65% concentration go first. Their spells land beautifully — more enemies fail the save. Then they get hit. And their concentration crumbles.

The DC 15 tanks laugh. Their spells land less often, but when they do? They HOLD. The Tortle with 99% concentration is still running Hypnotic Pattern while the Yuan-Ti glass cannon is picking up the pieces of their third failed check.

**But neither extreme wins.** The pure glass cannons are too fragile. The pure tanks' spells miss too often.

The DC 16 sweet-spot builds survive. They land their spells AND hold them.`,
      eliminated: sorted.slice(14).map(b => b.name),
      survivors: sorted.slice(0, 14).map(b => b.name),
    },
    {
      title: '⚔️ Round 2 — Species Matter',
      subtitle: 'Same feats, same spells. What do you bring that I can\'t buy?',
      narrative: `With the weakest builds gone, the arena shifts. Every remaining bard can cast and hold spells. The question becomes: **what can you do that my spell list can't?**

Custom Lineage has three feats and CHA 20 with armor. On paper, the best stat block. But in the arena, when two bards both cast Hypnotic Pattern... the one with **Magic Resistance** shrugs it off. The one with **Hidden Step** goes invisible. The one with **Fey Step** teleports away.

Custom Lineage has nothing. No escape hatch. No spell resistance. No free CC.

Tortle sits in its shell. AC 21. Nearly unkillable. But it can't DO anything from in there. And when it comes out, CHA 17 means its spells whiff more than anyone else's.

**The species with free actions win this round.** Eladrin charms without spending slots. Firbolg vanishes without concentration. Yuan-Ti resists magic passively. Satyr laughs at enemy casters.`,
      eliminated: sorted.slice(10, 14).map(b => b.name),
      survivors: sorted.slice(0, 10).map(b => b.name),
    },
    {
      title: '🔥 Round 3 — The Final Table',
      subtitle: 'Ten bards. Three pillars. One crown.',
      narrative: `Ten builds remain. All can fight. All can hold concentration. All have species features worth a damn.

Now the arena tests all three pillars:

**Combat:** Cast your best spell, hold it, survive. Use your species abilities to gain advantage. The Eladrin casts Hypnotic Pattern then Fey Steps into position, charming two more with Autumn. That's potentially 8+ enemies affected in two turns. The Firbolg casts Hold Person then goes invisible — can't be targeted, concentration safe through prevention.

**Social:** The king must negotiate, persuade, deceive. Firbolg has free Disguise Self, beast speech, and CHA 18+. Yuan-Ti has free Suggestion. Eladrin charms people by teleporting near them. Gem Dragonborn reads minds with telepathy.

**Durability:** You can't rule from the grave. Satyr and Yuan-Ti both have Magic Resistance — advantage on ALL saves vs. spells. That's the single strongest defensive trait in the game.

The balanced builds — the ones with DC 16, one defense feat, AND strong species features — dominate.`,
      eliminated: sorted.slice(5, 10).map(b => b.name),
      survivors: sorted.slice(0, 5).map(b => b.name),
    },
    {
      title: '👑 Round 4 — The Coronation',
      subtitle: 'Five champions. The bards deliberate. One is anointed.',
      narrative: null,  // This gets generated dynamically
    }
  ];
  
  return rounds[round] || rounds[0];
}

// ─── COMPONENTS ─────────────────────────────────────────────────────────────

function ScoreBreakdown({ build }) {
  const s = build.arenaScore;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.15rem 0.75rem', fontSize: '0.78rem' }}>
      {Object.entries(WEIGHTS).map(([key, weight]) => {
        const val = s.raw[key] || 0;
        const labels = {
          spellDc: 'Spell DC Power', concentrationHold: 'Concentration Hold',
          speciesDefense: 'Species Defense', speciesOffense: 'Species Offense',
          speciesSocial: 'Species Social', speciesUnique: 'Unique Factor',
          ac: 'Armor Class', versatility: 'Versatility', fun: 'Fun Factor',
        };
        return (
          <div key={key} style={{ display: 'contents' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{labels[key]}</span>
            <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>×{weight}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <div style={{ width: '60px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                <div style={{
                  width: `${val * 10}%`, height: '100%', borderRadius: 3,
                  background: val >= 8 ? 'var(--accent-gold)' : val >= 5 ? 'var(--accent-blue)' : 'var(--accent-red)'
                }} />
              </div>
              <span style={{ color: val >= 8 ? 'var(--accent-gold)' : val >= 5 ? 'var(--accent-blue)' : 'var(--accent-red)', fontWeight: 600, minWidth: '1.5rem', textAlign: 'right' }}>
                {val.toFixed(1)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BuildChip({ build, rank, isKing, isEliminated, onClick }) {
  const sp = build.species?.name || '?';
  const pct = build.arenaScore.pct;
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '0.75rem',
      padding: '0.65rem 1rem', borderRadius: '8px', cursor: 'pointer',
      background: isKing ? 'rgba(212,168,75,0.15)' : isEliminated ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
      border: isKing ? '2px solid var(--accent-gold)' : '1px solid var(--border)',
      opacity: isEliminated ? 0.4 : 1,
      transition: 'all 0.2s',
      textDecoration: isEliminated ? 'line-through' : 'none',
    }}>
      <span style={{
        fontWeight: 700, fontSize: '0.85rem', minWidth: '1.8rem', textAlign: 'center',
        color: rank === 1 ? 'var(--accent-gold)' : rank <= 5 ? 'var(--accent-blue)' : 'var(--text-muted)'
      }}>
        {isKing ? '👑' : `#${rank}`}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: isKing ? 'var(--accent-gold)' : 'var(--text-primary)' }}>
          {build.name}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          DC {build.spellDc} · AC {build.finalAc} · {build.concentrationHoldPct}% conc · CHA {build.finalCha}
        </div>
      </div>
      <div style={{
        fontWeight: 700, fontSize: '1rem',
        color: pct >= 75 ? 'var(--accent-gold)' : pct >= 60 ? 'var(--accent-blue)' : 'var(--text-muted)'
      }}>
        {pct}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ──────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentRound, setCurrentRound] = useState(0);
  const [selectedBuild, setSelectedBuild] = useState(null);
  const [revealedRounds, setRevealedRounds] = useState(new Set([0]));

  useEffect(() => {
    api.getBuilds().then(b => {
      const scored = b.map(build => ({ ...build, arenaScore: scoreBuild(build) }));
      scored.sort((a, b) => b.arenaScore.pct - a.arenaScore.pct);
      setBuilds(scored);
      setLoading(false);
    }).catch(err => { console.error(err); setLoading(false); });
  }, []);

  if (loading) return <div className="loading">Preparing the arena...</div>;

  const sorted = [...builds].sort((a, b) => b.arenaScore.pct - a.arenaScore.pct);
  const king = sorted[0];
  const top5 = sorted.slice(0, 5);
  const round = getRoundAnalysis(builds, currentRound);

  // Determine eliminated builds based on round
  const eliminatedNames = new Set();
  for (let r = 0; r <= currentRound; r++) {
    const rd = getRoundAnalysis(builds, r);
    if (rd.eliminated) rd.eliminated.forEach(n => eliminatedNames.add(n));
  }

  function advanceRound() {
    const next = Math.min(currentRound + 1, 3);
    setCurrentRound(next);
    setRevealedRounds(prev => new Set([...prev, next]));
  }

  // Final round narrative
  const finalNarrative = currentRound === 3 ? generateFinalNarrative(sorted) : null;

  return (
    <div className="page">
      <h2 className="page-title" style={{ fontSize: '1.8rem' }}>⚔️ The Arena</h2>
      <p className="page-subtitle">21 Lore Bards enter. One is anointed King.</p>

      {/* Round navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {[0, 1, 2, 3].map(r => (
          <button key={r} onClick={() => { setCurrentRound(r); setRevealedRounds(prev => new Set([...prev, r])); }}
            disabled={!revealedRounds.has(r) && r > Math.max(...revealedRounds) + 1}
            style={{
              padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: currentRound === r ? 'var(--accent-gold)' : revealedRounds.has(r) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
              color: currentRound === r ? '#000' : revealedRounds.has(r) ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: currentRound === r ? 700 : 400,
              fontFamily: 'Cinzel, serif', fontSize: '0.85rem',
              opacity: (!revealedRounds.has(r) && r > Math.max(...revealedRounds) + 1) ? 0.3 : 1,
            }}>
            {r === 3 ? '👑 Coronation' : `Round ${r + 1}`}
          </button>
        ))}
      </div>

      {/* Round content */}
      <div style={{
        padding: '1.5rem', borderRadius: '12px',
        background: currentRound === 3 ? 'rgba(212,168,75,0.08)' : 'rgba(0,0,0,0.25)',
        border: currentRound === 3 ? '2px solid rgba(212,168,75,0.3)' : '1px solid var(--border)',
        marginBottom: '2rem',
      }}>
        <h3 style={{ fontFamily: 'Cinzel, serif', color: 'var(--accent-gold)', margin: '0 0 0.25rem 0', fontSize: '1.2rem' }}>
          {round.title}
        </h3>
        <div style={{ color: 'var(--accent-blue)', fontSize: '0.85rem', marginBottom: '1rem', fontStyle: 'italic' }}>
          {round.subtitle}
        </div>
        <div style={{
          color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7,
          whiteSpace: 'pre-line',
        }}>
          {currentRound === 3 ? finalNarrative : round.narrative}
        </div>

        {round.eliminated && currentRound < 3 && (
          <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(248,113,113,0.06)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.15)' }}>
            <div style={{ color: 'var(--accent-red)', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
              ☠️ Eliminated this round:
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.6 }}>
              {round.eliminated.join(' · ')}
            </div>
          </div>
        )}

        {currentRound < 3 && (
          <button onClick={advanceRound} style={{
            marginTop: '1.25rem', padding: '0.6rem 1.5rem', borderRadius: '8px',
            background: 'var(--accent-gold)', color: '#000', border: 'none',
            fontWeight: 700, fontFamily: 'Cinzel, serif', cursor: 'pointer',
            fontSize: '0.9rem',
          }}>
            {currentRound === 2 ? '👑 Crown the King' : 'Next Round →'}
          </button>
        )}
      </div>

      {/* Standings */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div>
          <h3 style={{ fontFamily: 'Cinzel, serif', color: 'var(--accent-gold)', marginBottom: '0.75rem', fontSize: '1rem' }}>
            Full Rankings
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {sorted.map((build, i) => (
              <BuildChip
                key={build._id}
                build={build}
                rank={i + 1}
                isKing={i === 0 && currentRound === 3}
                isEliminated={eliminatedNames.has(build.name)}
                onClick={() => setSelectedBuild(selectedBuild?._id === build._id ? null : build)}
              />
            ))}
          </div>
        </div>

        <div>
          {selectedBuild ? (
            <div style={{ position: 'sticky', top: '1rem' }}>
              <h3 style={{ fontFamily: 'Cinzel, serif', color: 'var(--accent-gold)', marginBottom: '0.75rem', fontSize: '1rem' }}>
                {selectedBuild.name}
              </h3>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                {selectedBuild.species?.name} · {selectedBuild.archetype} · CHA {selectedBuild.finalCha}
              </div>
              <div style={{
                padding: '1rem', borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)',
                marginBottom: '1rem',
              }}>
                <div style={{ fontWeight: 700, color: 'var(--accent-gold)', fontSize: '1.5rem', marginBottom: '0.25rem' }}>
                  {selectedBuild.arenaScore.pct}/100
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginBottom: '1rem' }}>
                  Arena Power Score
                </div>
                <ScoreBreakdown build={selectedBuild} />
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Feats</div>
                <div style={{ marginBottom: '0.75rem' }}>
                  {selectedBuild.feats?.map(f => f.name).join(', ')}
                </div>
                <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Items</div>
                <div style={{ marginBottom: '0.75rem' }}>
                  {selectedBuild.items?.map(i => i.name).join(', ')}
                </div>
                <div style={{ fontWeight: 600, marginBottom: '0.35rem' }}>Species Power</div>
                <div>{SPECIES_POWER[selectedBuild.species?.name]?.desc || 'No innate abilities.'}</div>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '200px', color: 'var(--text-muted)', fontSize: '0.9rem',
              border: '1px dashed var(--border)', borderRadius: '12px',
            }}>
              Click a build to inspect
            </div>
          )}
        </div>
      </div>

      {/* Methodology */}
      <details style={{ marginTop: '2rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
        <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
          Scoring Methodology
        </summary>
        <div style={{ padding: '1rem', background: 'rgba(0,0,0,0.15)', borderRadius: '8px', lineHeight: 1.7 }}>
          <p>Each build is scored across 9 dimensions, weighted by importance to a Level 8 Lore Bard:</p>
          <ul style={{ paddingLeft: '1.25rem' }}>
            {Object.entries(WEIGHTS).map(([key, w]) => {
              const labels = {
                spellDc: 'Spell DC Power', concentrationHold: 'Concentration Hold',
                speciesDefense: 'Species Defense', speciesOffense: 'Species Offense',
                speciesSocial: 'Species Social', speciesUnique: 'Unique Factor',
                ac: 'Armor Class', versatility: 'Versatility', fun: 'Fun Factor',
              };
              return <li key={key}><strong>{labels[key]}</strong> — weight {w}</li>;
            })}
          </ul>
          <p style={{ marginTop: '0.5rem' }}>
            Species innate power (defense, offense, social, uniqueness) is rated separately from feat/item choices
            because it represents power you get <em>for free</em> — things no other species can replicate.
            A Satyr's Magic Resistance or a Firbolg's Hidden Step can't be bought with feats.
          </p>
          <p>
            <strong>Versatility</strong> rewards builds that don't sacrifice one pillar entirely for another.
            A DC 16 build with 91% concentration scores higher in versatility than a DC 17 build with 55%.
          </p>
        </div>
      </details>
    </div>
  );
}

// ─── CORONATION NARRATIVE ───────────────────────────────────────────────────

function generateFinalNarrative(sorted) {
  const king = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  const fourth = sorted[3];
  const fifth = sorted[4];

  const kName = king.name;
  const kSpecies = king.species?.name;
  const sSpecies = second.species?.name;

  let coronation = `The five finalists stand in the center of the arena. The crowd is silent.

`;

  // Describe each finalist briefly
  coronation += `**${fifth.name}** steps forward. ${fifth.species?.name}. DC ${fifth.spellDc}, AC ${fifth.finalAc}, ${fifth.concentrationHoldPct}% concentration hold. ${SPECIES_POWER[fifth.species?.name]?.desc || ''} A worthy champion — but not today.\n\n`;
  coronation += `**${fourth.name}** is next. ${fourth.species?.name}. DC ${fourth.spellDc}, AC ${fourth.finalAc}, ${fourth.concentrationHoldPct}% concentration. ${SPECIES_POWER[fourth.species?.name]?.desc || ''} Close. So close.\n\n`;
  coronation += `**${third.name}** takes the stage. ${third.species?.name}. DC ${third.spellDc}, AC ${third.finalAc}, ${third.concentrationHoldPct}% concentration. `;

  coronation += `The crowd murmurs. This one could rule.\n\n`;

  // The final two
  coronation += `And then it's down to two.\n\n`;
  coronation += `**${second.name}** — ${sSpecies}. DC ${second.spellDc}. AC ${second.finalAc}. ${second.concentrationHoldPct}% concentration hold. Arena score: **${second.arenaScore.pct}**.\n\n`;
  coronation += `**${kName}** — ${kSpecies}. DC ${king.spellDc}. AC ${king.finalAc}. ${king.concentrationHoldPct}% concentration hold. Arena score: **${king.arenaScore.pct}**.\n\n`;

  // The verdict
  const matchup = getMatchupVerdict(king, second);

  coronation += `───────────────────────────\n\n`;
  coronation += `The bards confer. They argue. They cast Zone of Truth on each other (and all fail the save, naturally).\n\n`;

  if (matchup) {
    coronation += matchup + '\n\n';
  }

  coronation += `The verdict is unanimous.\n\n`;
  coronation += `**${kName}** kneels. The crown is placed.\n\n`;

  // Why they won
  const sp = SPECIES_POWER[kSpecies] || {};
  coronation += `───────────────────────────\n\n`;
  coronation += `## 👑 ${kName}\n\n`;
  coronation += `**The King of Lore Bards.**\n\n`;
  coronation += `DC ${king.spellDc}. AC ${king.finalAc}. CHA ${king.finalCha}. ${king.concentrationHoldPct}% concentration hold.\n\n`;
  coronation += `Arena Power Score: **${king.arenaScore.pct}/100**\n\n`;
  
  coronation += `Feats: ${king.feats?.map(f => f.name).join(' + ')}\n`;
  coronation += `Items: ${king.items?.map(i => i.name).join(' + ')}\n\n`;

  if (kSpecies === 'Firbolg') {
    coronation += `**Why Firbolg rules:**\n`;
    coronation += `- Hidden Step (BA invisible, not a spell, PB/LR) protects concentration through prevention\n`;
    coronation += `- Free Disguise Self makes you the ultimate infiltrator\n`;
    coronation += `- Free Detect Magic means you never miss an aura\n`;
    coronation += `- Speech of Beast and Leaf is an entire social toolkit\n`;
    coronation += `- The combination of CHA ${king.finalCha}/DC ${king.spellDc} with Fey Touched (Misty Step + free spell) gives you teleportation AND invisibility\n`;
    coronation += `- You don't just cast the best spells — you cast them and then DISAPPEAR\n`;
  } else if (kSpecies === 'Eladrin') {
    coronation += `**Why Eladrin rules:**\n`;
    coronation += `- Fey Step + Autumn = bonus action teleport that charms 2 creatures. Not a spell. Not concentration.\n`;
    coronation += `- Best action economy in the game: Hypnotic Pattern + Fey Step = two CC effects in one turn\n`;
    coronation += `- Fey type = immune to Hold Person, Charm Person, and similar humanoid-targeting spells\n`;
    coronation += `- Season-switching gives 4 different tactical options on the same ability\n`;
  } else {
    coronation += `**Why ${kSpecies} rules:**\n`;
    coronation += `- ${sp.desc || 'An exceptional combination of power and versatility.'}\n`;
  }

  coronation += `\n**The other 20 bards bow. The arena empties. The king plays a song.**`;

  return coronation;
}
