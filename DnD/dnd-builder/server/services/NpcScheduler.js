'use strict'

/**
 * NpcScheduler — maps each NPC's daily activities by hour (0-23).
 *
 * Each schedule entry: { location, activity, moodHint }
 * moodHint is optional; null means use the NPC's emotionalBaseline.
 */

// ── Helper builders ───────────────────────────────────────────────────────────
const sleep  = (loc)       => ({ location: loc, activity: 'sleeping',  moodHint: 'groggy'   })
const eat    = (loc)       => ({ location: loc, activity: 'eating',    moodHint: 'content'  })
const rest   = (loc)       => ({ location: loc, activity: 'resting',   moodHint: 'relaxed'  })
const work   = (loc, act)  => ({ location: loc, activity: act,         moodHint: null       })
const travel = (from, to)  => ({
  location: `traveling from ${from} to ${to}`,
  activity: 'traveling',
  moodHint: null,
})

/**
 * Build a 24-entry schedule array from block definitions.
 * blocks: Array of [startHour, endHour, entry]
 * Any unspecified hours default to sleeping at home.
 */
function buildSchedule(blocks) {
  const schedule = new Array(24)
  for (const [start, end, entry] of blocks) {
    for (let h = start; h < end; h++) {
      schedule[h] = entry
    }
  }
  for (let h = 0; h < 24; h++) {
    if (!schedule[h]) schedule[h] = sleep('home')
  }
  return schedule
}

// ── Per-NPC schedules ─────────────────────────────────────────────────────────
const NPC_SCHEDULES = {

  // ── Children ──────────────────────────────────────────────────────────────
  bree_millhaven: buildSchedule([
    [0,  7,  sleep('home')],
    [7,  8,  eat('home — kitchen')],
    [8,  13, work('village school', 'attending lessons')],
    [13, 14, eat('market square')],
    [14, 18, work('around town', 'exploring, investigating, asking questions')],
    [18, 19, eat('home')],
    [19, 21, work('home', 'reading and thinking through observations')],
    [21, 24, sleep('home')],
  ]),

  tuck_millhaven: buildSchedule([
    [0,  7,  sleep('home — Mill Road')],
    [7,  8,  eat('home')],
    [8,  13, work('village school', 'attending lessons (partially)')],
    [13, 14, eat('market square')],
    [14, 19, work('all over town', 'running, exploring, and looking for trouble')],
    [19, 20, eat('home')],
    [20, 22, rest('home')],
    [22, 24, sleep('home')],
  ]),

  // ── Townsfolk ─────────────────────────────────────────────────────────────
  oma_steadwick: buildSchedule([
    [0,  5,  sleep('home above Green Gate Bakery')],
    [5,  7,  work('Green Gate Bakery', 'baking the first loaves of the day')],
    [7,  8,  eat('bakery — back room')],
    [8,  10, work('Green Gate Bakery', 'baking and preparing for the day')],
    [10, 18, work('Green Gate Bakery', 'serving customers and baking')],
    [18, 19, eat('home above bakery')],
    [19, 21, rest('home above bakery')],
    [21, 24, sleep('home above bakery')],
  ]),

  brother_aldwin: buildSchedule([
    [0,  6,  sleep('temple vestry')],
    [6,  7,  work('Temple of the Allmother', 'morning prayers')],
    [7,  8,  eat('temple vestry')],
    [8,  12, work('around town', 'visiting parishioners and the sick')],
    [12, 13, eat('temple')],
    [13, 17, work('Temple of the Allmother', 'counseling and pastoral work')],
    [17, 18, work('Temple of the Allmother', 'vespers service')],
    [18, 19, eat('temple vestry')],
    [19, 21, work('temple vestry', 'writing and prayer')],
    [21, 24, sleep('temple vestry')],
  ]),

  brennan_holt: buildSchedule([
    [0,  6,  sleep('home')],
    [6,  7,  eat('home')],
    [7,  17, work('north gate', 'standing guard and checking travelers')],
    [17, 18, travel('north gate', 'home')],
    [18, 19, eat('home')],
    [19, 22, rest('home')],
    [22, 24, sleep('home')],
  ]),

  captain_edric_vane: buildSchedule([
    [0,  6,  sleep('guard barracks')],
    [6,  7,  eat('guard barracks')],
    [7,  8,  work('guard house', 'morning patrol briefing')],
    [8,  12, work('around town', 'patrol rounds and inspections')],
    [12, 13, eat('guard house')],
    [13, 17, work('guard house', 'reports and administrative work')],
    [17, 19, work('around town', 'evening patrol')],
    [19, 21, rest('guard house')],
    [21, 24, sleep('guard barracks')],
  ]),

  vesna_calloway: buildSchedule([
    [0,  5,  sleep('home')],
    [5,  7,  work('fields outside town', 'gathering herbs at dawn')],
    [7,  8,  eat('home')],
    [8,  9,  work('herb shop', 'sorting the morning harvest')],
    [9,  17, work('herb shop', 'serving customers and preparing remedies')],
    [17, 18, eat('home')],
    [18, 22, work('home', 'studying herbalism texts and running experiments')],
    [22, 24, sleep('home')],
  ]),

  davan_merchant: buildSchedule([
    [0,  7,  sleep('home')],
    [7,  8,  eat('home')],
    [8,  9,  work('trading post', 'counting stock and opening up')],
    [9,  18, work('trading post', 'trading and negotiating')],
    [18, 19, eat('home')],
    [19, 21, work('home', 'reviewing ledgers')],
    [21, 24, sleep('home')],
  ]),

  mira_barrelbottom: buildSchedule([
    [0,  2,  work("Mira's Tavern", 'last call and cleaning up')],
    [2,  9,  sleep('rooms above the tavern')],
    [9,  11, work("Mira's Tavern", 'preparing the kitchen and tapping new barrels')],
    [11, 24, work("Mira's Tavern", 'running the tavern — cooking, serving, listening')],
  ]),

  aldovar_crennick: buildSchedule([
    [0,  7,  sleep('home')],
    [7,  8,  eat('home')],
    [8,  9,  travel('home', 'council hall')],
    [9,  12, work('council hall', 'council meetings and proceedings')],
    [12, 13, eat('council hall')],
    [13, 17, work('council hall', 'administrative work and paperwork')],
    [17, 18, travel('council hall', 'home')],
    [18, 19, eat('home')],
    [19, 22, rest('home')],
    [22, 24, sleep('home')],
  ]),

  widow_marsh: buildSchedule([
    [0,  7,  sleep('home')],
    [7,  8,  work('home', 'morning ritual — lighting a candle for the dead')],
    [8,  9,  travel('home', 'Temple of the Allmother')],
    [9,  11, work('Temple of the Allmother', 'quiet vigil')],
    [11, 17, { location: 'temple steps', activity: 'sitting and watching the town go by', moodHint: 'melancholy' }],
    [17, 18, travel('temple steps', 'home')],
    [18, 20, eat('home')],
    [20, 24, sleep('home')],
  ]),

  wren_stable: buildSchedule([
    [0,  5,  sleep('stable loft')],
    [5,  8,  work('stables', 'morning feeding and watering')],
    [8,  9,  eat('stable loft')],
    [9,  12, work('stables', 'mucking stalls')],
    [12, 13, eat('stable loft')],
    [13, 17, work('stables', 'grooming horses and tending tack')],
    [17, 20, work('stables', 'evening feeding')],
    [20, 22, rest('stable loft')],
    [22, 24, sleep('stable loft')],
  ]),

  hodge_fence: buildSchedule([
    [0,  12, sleep('rooms above pawnshop')],
    [12, 13, eat('home')],
    [13, 20, work('pawnshop', 'buying and selling goods of questionable origin')],
    [20, 24, work("Mira's Tavern", 'drinking and making connections')],
  ]),

  pip_apprentice: buildSchedule([
    [0,  6,  sleep('forge apprentice quarters')],
    [6,  7,  eat('forge quarters')],
    [7,  12, work('the forge', 'pumping bellows and basic smithing tasks')],
    [12, 13, eat('forge quarters')],
    [13, 17, work('the forge', 'smithing and learning the craft')],
    [17, 18, eat('forge quarters')],
    [18, 20, rest('forge quarters')],
    [20, 22, work('forge quarters', 'studying metallurgy texts')],
    [22, 24, sleep('forge quarters')],
  ]),

  torval_grimm: buildSchedule([
    [0,  5,  sleep('rented room above tavern')],
    [5,  7,  work('outside town walls', 'pre-dawn training drills alone')],
    [7,  9,  work('market square', 'morning warm-down and looking for work')],
    [9,  17, work('around town', 'mercenary patrol or odd jobs')],
    [17, 18, eat('rented room')],
    [18, 22, work("Mira's Tavern", 'drinking and watching the door')],
    [22, 24, sleep('rented room above tavern')],
  ]),

  floris_embrich: buildSchedule([
    [0,  7,  sleep('home')],
    [7,  8,  eat('home')],
    [8,  9,  travel('home', 'market')],
    [9,  17, work('market stall', 'selling cloth and notions')],
    [17, 18, travel('market', 'home')],
    [18, 19, eat('home')],
    [19, 22, work('home', 'mending and sewing by lamplight')],
    [22, 24, sleep('home')],
  ]),

  fen_colby: buildSchedule([
    [0,  8,  sleep('home — east side of town')],
    [8,  9,  eat('home')],
    [9,  12, work('home', 'woodworking — whittling and small repairs')],
    [12, 13, eat('home')],
    [13, 17, { location: 'around town', activity: 'moving quietly and watching', moodHint: 'guarded' }],
    [17, 18, eat('home')],
    [18, 20, { location: 'home', activity: 'sitting alone with something on his mind', moodHint: 'burdened' }],
    [20, 24, sleep('home')],
  ]),

  sera_dunwick: buildSchedule([
    [0,  7,  sleep('home')],
    [7,  8,  eat('home')],
    [8,  17, work('seamstress shop', 'sewing, alterations, and fitting customers')],
    [17, 18, eat('home')],
    [18, 21, rest('home')],
    [21, 24, sleep('home')],
  ]),

  old_mattock: buildSchedule([
    [0,  7,  sleep('home')],
    [7,  9,  work('home', 'slow morning ritual — creaking joints and bad tea')],
    [9,  11, { location: 'market square bench', activity: 'sitting and watching the world go by', moodHint: 'weathered' }],
    [11, 13, eat('home')],
    [13, 15, rest('home')],
    [15, 17, { location: 'market square bench', activity: 'back to the bench — more watching', moodHint: 'weathered' }],
    [17, 18, travel('market', 'home')],
    [18, 20, eat('home')],
    [20, 24, sleep('home')],
  ]),

  dolly_thurn: buildSchedule([
    [0,  7,  sleep('home')],
    [7,  8,  eat('home')],
    [8,  17, work('laundry yard', 'washing and drying the town\'s laundry')],
    [17, 18, eat('home')],
    [18, 20, rest('home')],
    [20, 22, work('home', 'folding and sorting')],
    [22, 24, sleep('home')],
  ]),

  lell_sparrow: buildSchedule([
    [0,  6,  sleep('riverside camp')],
    [6,  8,  work('riverside', 'setting morning fishing lines')],
    [8,  9,  eat('riverside')],
    [9,  15, work('river and market', 'fishing and selling the catch')],
    [15, 18, { location: 'riverside', activity: 'mending nets in the afternoon sun', moodHint: 'peaceful' }],
    [18, 20, eat('riverside camp')],
    [20, 22, rest('riverside camp')],
    [22, 24, sleep('riverside camp')],
  ]),

  // ── Adversaries ───────────────────────────────────────────────────────────
  bandit: buildSchedule([
    [0,  4,  work('road outside town', 'watching for late travelers')],
    [4,  10, sleep('bandit camp')],
    [10, 14, work('bandit camp', 'eating and gambling')],
    [14, 18, rest('bandit camp')],
    [18, 24, work('forest roads', 'actively patrolling for marks')],
  ]),

  goblin: buildSchedule([
    [0,  6,  work('forest', 'hunting and causing trouble in the dark')],
    [6,  14, sleep('goblin warren')],
    [14, 17, work('goblin warren', 'squabbling and sharpening weapons')],
    [17, 20, rest('goblin warren')],
    [20, 24, work('forest edge', 'scouting and prowling')],
  ]),

  orc: buildSchedule([
    [0,  6,  sleep('war camp')],
    [6,  8,  work('war camp', 'morning drills and intimidation rituals')],
    [8,  14, work('war camp perimeter', 'patrolling territory')],
    [14, 16, eat('war camp')],
    [16, 18, work('war camp', 'weapon maintenance')],
    [18, 24, { location: 'war camp', activity: 'feasting and boasting around the fire', moodHint: 'aggressive' }],
  ]),

  wolf: buildSchedule([
    [0,  5,  work('forest', 'night hunting with the pack')],
    [5,  14, sleep('wolf den')],
    [14, 17, { location: 'wolf den', activity: 'sleeping lightly, keeping watch', moodHint: 'alert' }],
    [17, 24, work('forest and fields', 'hunting and territorial marking')],
  ]),

  skeleton: buildSchedule([
    [0, 24, work('crypt or lair', 'standing guard, mindlessly patrolling')],
  ]),

  zombie: buildSchedule([
    [0, 24, work('lair', 'shambling aimlessly, driven by hunger')],
  ]),

  knight: buildSchedule([
    [0,  6,  sleep('camp or inn')],
    [6,  7,  work('camp', 'morning prayers and arming')],
    [7,  8,  eat('camp')],
    [8,  17, work('road or patrol route', 'on duty — riding and watching')],
    [17, 18, eat('camp')],
    [18, 20, work('camp', 'equipment maintenance and planning')],
    [20, 24, sleep('camp or inn')],
  ]),

  cult_fanatic: buildSchedule([
    [0,  3,  work('hidden shrine', 'midnight ritual prayers')],
    [3,  9,  sleep('cult hideout')],
    [9,  12, work('cult hideout', 'studying dark texts')],
    [12, 13, eat('cult hideout')],
    [13, 17, work('around town', 'recruiting and observing')],
    [17, 21, work('cult hideout', 'preparation rituals')],
    [21, 24, work('hidden shrine', 'evening rituals')],
  ]),

  archmage: buildSchedule([
    [0,  5,  work('tower study', 'researching by candlelight')],
    [5,  9,  sleep('tower chambers')],
    [9,  12, work('tower study', 'studying ancient texts')],
    [12, 13, eat('tower')],
    [13, 17, work('tower laboratory', 'magical experiments')],
    [17, 19, work('tower study', 'correspondence and consultation')],
    [19, 24, work('tower study', 'late-night research and rituals')],
  ]),

  lich: buildSchedule([
    [0,  6,  work('lair', 'maintaining phylactery and casting ritual magic')],
    [6,  12, work('lair throne room', 'receiving undead servants and planning')],
    [12, 18, work('lair library', 'studying ancient knowledge')],
    [18, 24, work('lair', 'dark rituals and correspondence with dark powers')],
  ]),

  young_red_dragon: buildSchedule([
    [0,  5,  sleep('mountain lair')],
    [5,  8,  work('mountain lair', 'counting hoard and admiring treasure')],
    [8,  12, work('surrounding territory', 'hunting — flying patrol and attacking prey')],
    [12, 15, sleep('mountain lair — postprandial')],
    [15, 18, { location: 'mountain lair entrance', activity: 'sunning on the rocks', moodHint: 'smug' }],
    [18, 21, work('territory edge', 'marking territory with fire')],
    [21, 24, sleep('mountain lair')],
  ]),
}

// ── Default schedule fallbacks ────────────────────────────────────────────────
function defaultEnemySchedule() {
  return buildSchedule([
    [0,  6,  { location: 'lair', activity: 'resting and recovering', moodHint: 'hostile' }],
    [6,  10, { location: 'lair', activity: 'patrolling', moodHint: 'hostile' }],
    [10, 18, { location: 'territory', activity: 'active and alert', moodHint: 'hostile' }],
    [18, 24, { location: 'lair', activity: 'resting', moodHint: 'hostile' }],
  ])
}

function defaultFriendlySchedule() {
  return buildSchedule([
    [0,  7,  sleep('home')],
    [7,  8,  eat('home')],
    [8,  17, work('usual place', 'going about daily business')],
    [17, 18, eat('home')],
    [18, 21, rest('home')],
    [21, 24, sleep('home')],
  ])
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Get NPC schedule entry for a given hour.
 * @param {string} templateKey
 * @param {number} hour  0-23
 * @param {string} [npcType]  'friendly' | 'neutral' | 'enemy'
 * @returns {{ location: string, activity: string, moodHint: string|null }}
 */
function getScheduleEntry(templateKey, hour, npcType = 'friendly') {
  const schedule = NPC_SCHEDULES[templateKey]
    || (npcType === 'enemy' ? defaultEnemySchedule() : defaultFriendlySchedule())
  return schedule[hour] || sleep('home')
}

/**
 * Get the full 24-hour schedule for an NPC.
 * @param {string} templateKey
 * @param {string} [npcType]
 * @returns {Array}
 */
function getFullSchedule(templateKey, npcType = 'friendly') {
  return NPC_SCHEDULES[templateKey]
    || (npcType === 'enemy' ? defaultEnemySchedule() : defaultFriendlySchedule())
}

module.exports = { getScheduleEntry, getFullSchedule, NPC_SCHEDULES }
