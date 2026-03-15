'use strict'

/**
 * WorldEngine — singleton service that tracks game time and NPC world state.
 *
 * Game time is measured in "ticks". Each tick advances the world by one game hour.
 * The real-time tick interval is configurable (default: off / manual-only).
 *
 * NPCs live their daily lives: each hour they have a location, activity, and mood,
 * derived from NpcScheduler. This state feeds into encounter context so NPCs respond
 * differently depending on what they were doing when the player interrupted them.
 */

const EventEmitter = require('events')
const path         = require('path')
const fs           = require('fs')
const { getScheduleEntry } = require('./NpcScheduler')

// ── World calendar constants ──────────────────────────────────────────────────
const SEASONS  = ['spring', 'summer', 'autumn', 'winter']
const DAY_NAMES = ['Moonday', 'Tidesday', 'Weedensday', 'Thunderday', 'Fireday', 'Starday', 'Sunday']
const DAYS_PER_SEASON = 91  // 13 weeks × 7 days

// ── WorldEngine ───────────────────────────────────────────────────────────────
class WorldEngine extends EventEmitter {
  constructor() {
    super()

    // World clock — starts at 8 AM, Day 1, Spring
    this._hour   = 8
    this._day    = 1
    this._season = 0  // index into SEASONS

    // Auto-tick state
    this._tickIntervalMs = null  // null = not running
    this._tickTimer      = null
    this._running        = false

    // NPC state cache: templateKey → state object (cleared each tick)
    this._npcCache = new Map()

    // Loaded NPC personalities (lazy)
    this._personalities = null

    // World event log (most recent first, capped at 200)
    this._eventLog = []
  }

  // ── Personality loader ──────────────────────────────────────────────────────

  _loadPersonalities() {
    if (this._personalities) return this._personalities

    const dir = path.join(__dirname, '../data/npcPersonalities')
    const map = {}
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
      for (const file of files) {
        const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
        map[data.templateKey] = data
      }
    } catch (err) {
      console.error('[WorldEngine] Failed to load personalities:', err.message)
    }
    this._personalities = map
    return map
  }

  // ── Time ────────────────────────────────────────────────────────────────────

  /** Current world time as a plain object. */
  get time() {
    return {
      hour:          this._hour,
      day:           this._day,
      dayOfWeek:     this._day % 7,
      dayName:       DAY_NAMES[this._day % 7],
      season:        SEASONS[this._season],
      seasonDay:     ((this._day - 1) % DAYS_PER_SEASON) + 1,
      timeOfDay:     this._timeOfDay(),
      formattedTime: this._formatTime(),
    }
  }

  _timeOfDay() {
    const h = this._hour
    if (h >= 5  && h < 8)  return 'dawn'
    if (h >= 8  && h < 12) return 'morning'
    if (h >= 12 && h < 14) return 'midday'
    if (h >= 14 && h < 17) return 'afternoon'
    if (h >= 17 && h < 20) return 'dusk'
    if (h >= 20 && h < 22) return 'evening'
    return 'night'
  }

  _formatTime() {
    const h = this._hour
    const period = h < 12 ? 'AM' : 'PM'
    const display = h === 0 ? 12 : h > 12 ? h - 12 : h
    return `${display}:00 ${period}`
  }

  // ── NPC state ───────────────────────────────────────────────────────────────

  /**
   * Get the world state for a single NPC at the current hour.
   * Returns null if the templateKey is unknown.
   */
  getNpcState(templateKey) {
    const cached = this._npcCache.get(templateKey)
    if (cached) return cached

    const personalities = this._loadPersonalities()
    const personality   = personalities[templateKey]
    if (!personality) return null

    const npcType = personality.npcType || 'friendly'
    const entry   = getScheduleEntry(templateKey, this._hour, npcType)

    const state = {
      templateKey,
      name:        personality.name,
      race:        personality.race,
      npcType,
      location:    entry.location,
      activity:    entry.activity,
      moodHint:    entry.moodHint ?? personality.consciousnessContext?.emotionalBaseline ?? null,
      worldTime:   this.time,
    }

    this._npcCache.set(templateKey, state)
    return state
  }

  /** Get world states for all loaded NPCs. */
  getAllNpcStates() {
    const personalities = this._loadPersonalities()
    const result = {}
    for (const key of Object.keys(personalities)) {
      result[key] = this.getNpcState(key)
    }
    return result
  }

  /**
   * Build a world-context string suitable for injection into NPC prompts.
   * If the NPC is unknown, returns a generic time string.
   */
  buildWorldContextForNpc(templateKey) {
    const t = this.time
    const state = this.getNpcState(templateKey)

    if (!state) {
      return `It is ${t.formattedTime} (${t.timeOfDay}) on ${t.dayName}, ${t.season}.`
    }

    let ctx = `[World State] It is ${t.formattedTime} (${t.timeOfDay}) on ${t.dayName}, ${t.season}. `
    ctx += `${state.name} is currently at ${state.location}, ${state.activity}.`
    if (state.moodHint) ctx += ` They are feeling ${state.moodHint}.`
    return ctx
  }

  // ── Ticking ─────────────────────────────────────────────────────────────────

  /** Advance world time by one game hour. Returns the new time object. */
  tick() {
    this._hour = (this._hour + 1) % 24
    this._npcCache.clear()

    if (this._hour === 0) {
      this._day++
      // Recalculate season
      const dayInYear = ((this._day - 1) % (DAYS_PER_SEASON * 4))
      this._season    = Math.floor(dayInYear / DAYS_PER_SEASON)

      this._log(`A new day dawns — ${DAY_NAMES[this._day % 7]}, Day ${this._day} (${SEASONS[this._season]})`)
    }

    const t = this.time
    this._log(`Time advances to ${t.formattedTime} (${t.timeOfDay})`)
    this.emit('tick', t)
    return t
  }

  /** Set world time directly (skips natural flow, good for testing / DM control). */
  setTime({ hour, day } = {}) {
    if (hour !== undefined) this._hour = Math.max(0, Math.min(23, Math.floor(hour)))
    if (day  !== undefined) this._day  = Math.max(1, Math.floor(day))

    // Recalculate season
    const dayInYear  = ((this._day - 1) % (DAYS_PER_SEASON * 4))
    this._season     = Math.floor(dayInYear / DAYS_PER_SEASON)

    this._npcCache.clear()
    const t = this.time
    this._log(`Time set to ${t.formattedTime} on ${t.dayName}, Day ${t.day} (${t.season})`)
    this.emit('timeSet', t)
    return t
  }

  // ── Auto-tick ───────────────────────────────────────────────────────────────

  /**
   * Start auto-ticking.
   * @param {number} tickIntervalMs  Real milliseconds per game hour (min 1000 ms).
   * @returns {boolean} true if started, false if already running.
   */
  start(tickIntervalMs = 5 * 60 * 1000) {
    if (this._running) return false

    this._tickIntervalMs = Math.max(1000, tickIntervalMs)
    this._tickTimer      = setInterval(() => this.tick(), this._tickIntervalMs)
    this._running        = true

    this._log(`World engine started — 1 game hour = ${this._tickIntervalMs / 1000}s real time`)
    this.emit('started', { tickIntervalMs: this._tickIntervalMs })
    return true
  }

  /**
   * Stop auto-ticking.
   * @returns {boolean} true if stopped, false if wasn't running.
   */
  stop() {
    if (!this._running) return false

    clearInterval(this._tickTimer)
    this._tickTimer      = null
    this._running        = false
    this._tickIntervalMs = null

    this._log('World engine paused')
    this.emit('stopped')
    return true
  }

  get isRunning() { return this._running }

  // ── Event log ───────────────────────────────────────────────────────────────

  _log(message) {
    const entry = {
      id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      time:      this.time,
      message,
      timestamp: new Date().toISOString(),
    }
    this._eventLog.unshift(entry)
    if (this._eventLog.length > 200) this._eventLog.pop()
  }

  /** Append a custom world event (DM or system can call this). */
  logEvent(message) {
    this._log(message)
    this.emit('worldEvent', { message, time: this.time })
  }

  get eventLog() { return [...this._eventLog] }

  // ── Status ──────────────────────────────────────────────────────────────────

  getStatus() {
    return {
      time:            this.time,
      running:         this._running,
      tickIntervalMs:  this._tickIntervalMs,
      npcCount:        Object.keys(this._loadPersonalities()).length,
      recentEvents:    this._eventLog.slice(0, 20),
    }
  }
}

// ── Singleton export ──────────────────────────────────────────────────────────
module.exports = new WorldEngine()
