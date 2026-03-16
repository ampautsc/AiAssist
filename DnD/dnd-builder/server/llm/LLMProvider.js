/**
 * LLMProvider — Interface wrapper for the embedded character response model.
 *
 * Supports three backends, selected via LLM_PROVIDER env var:
 *   1. claude — Claude API (Haiku, Sonnet, etc.) via ANTHROPIC_API_KEY
 *   2. local  — node-llama-cpp embedded GGUF model via LLM_MODEL_PATH
 *
 * Consumer code works against the same interface regardless of backend:
 *   provider.complete(systemPrompt, userPrompt, options) → Promise<string>
 *   provider.isAvailable()                               → boolean
 *   provider.name                                        → string
 *
 * Prompt caching is automatically enabled for the Claude backend.
 * After the first call, the system prompt (full character backstory) costs
 * only 10% of normal on all subsequent turns — effectively free at scale.
 */

'use strict'

const https = require('https')
const { MockLLMProvider } = require('./MockLLMProvider')

// ── Response sanitizer ────────────────────────────────────────────────────────
/**
 * Strip artifacts that small models (TinyLlama, etc.) leak into responses:
 *   - Chat template tokens:  <|assistant|>  <|user|>  <|system|>  </s>
 *   - System prompt section headers: [INNER LIFE], [IDENTITY], etc.
 *   - Any content after a section header leak (model re-generates its own instructions)
 *
 * @param {string} raw
 * @returns {string}
 */
function sanitizeModelOutput(raw) {
  if (!raw) return ''

  let text = raw

  // 1. Strip leading/trailing chat-template tokens
  text = text.replace(/<\|[a-z_]+\|>/gi, '')   // <|assistant|>, <|user|>, <|system|>
  text = text.replace(/<\/s>/gi, '')            // </s> end-of-string token
  text = text.replace(/\\u003c[^>]+>/gi, '')    // escaped variants

  // 2. If the model leaked a system-prompt or user-prompt section header, cut from that point
  //    (the model is re-generating its own instructions — none of it is valid dialogue)
  const SECTION_HEADERS = /\[(INNER LIFE|IDENTITY|WANTS AND NEEDS|CHARACTER ARC|KNOWLEDGE|SECRETS|RELATIONSHIPS|HOOKS|CONVERSATION SO FAR|PERMANENT GROWTH|ENCOUNTER MEMORY|SITUATION)\]/i
  const headerMatch = text.search(SECTION_HEADERS)
  if (headerMatch !== -1) {
    text = text.slice(0, headerMatch)
  }

  // 3. Strip verbatim system/wake-up prompt preambles if the model echoes them
  text = text.replace(/^Before this moment[^.]*\.\s*/i, '')
  text = text.replace(/^Your emotional baseline[^.]*\.\s*/i, '')
  text = text.replace(/^Before responding[^\n]*\n?/i, '')
  text = text.replace(/^- (You are|Right now)[^\n]*\n?/gim, '')
  text = text.replace(/^- (Ask yourself|What you)[^\n]*\n?/gim, '')

  // 4. Collapse whitespace and trim
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return text
}

// ── Claude API provider ───────────────────────────────────────────────────────

/**
 * ClaudeAPIProvider — calls Anthropic's Messages API over raw HTTPS.
 *
 * Uses prompt caching (cache_control: ephemeral) on the system prompt so that
 * the full character backstory is billed at full rate only on the first turn;
 * all subsequent turns read from cache at 10% cost.
 *
 * Env vars:
 *   ANTHROPIC_API_KEY  — required
 *   ANTHROPIC_MODEL    — defaults to claude-haiku-4-5-20251001
 */
class ClaudeAPIProvider {
  constructor(options = {}) {
    this._apiKey    = process.env.ANTHROPIC_API_KEY
    this._model     = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
    this._maxTokens = options.maxTokens || 200
  }

  get name() { return `ClaudeAPIProvider(${this._model})` }

  isAvailable() { return !!this._apiKey }

  /**
   * @param {string} systemPrompt  Full character backstory / identity block
   * @param {string} userPrompt    The player's current message
   * @param {Object} options       { maxTokens, chatHistory }
   *   chatHistory: Array<{ role: 'user'|'assistant', content: string }>
   * @returns {Promise<string>}
   */
  async complete(systemPrompt, userPrompt, options = {}) {
    if (!this._apiKey) throw new Error('[Claude] ANTHROPIC_API_KEY is not set')

    const maxTokens = options.maxTokens || this._maxTokens

    const messages = [
      ...(options.chatHistory || []).map(msg => ({
        role:    msg.role,
        content: msg.content,
      })),
      { role: 'user', content: userPrompt },
    ]

    // cache_control on system prompt — backstory billed at full rate once,
    // then served from cache at ~10% cost for the rest of the encounter.
    const body = JSON.stringify({
      model:       this._model,
      max_tokens:  maxTokens,
      temperature: 0.8,
      system: [
        {
          type:          'text',
          text:          systemPrompt,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    })

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.anthropic.com',
          path:     '/v1/messages',
          method:   'POST',
          headers:  {
            'x-api-key':         this._apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-beta':    'prompt-caching-2024-07-31',
            'content-type':      'application/json',
            'content-length':    Buffer.byteLength(body),
          },
        },
        res => {
          let raw = ''
          res.on('data', chunk => { raw += chunk })
          res.on('end', () => {
            try {
              const parsed = JSON.parse(raw)
              if (parsed.error) {
                reject(new Error(`[Claude] API error ${parsed.error.type}: ${parsed.error.message}`))
                return
              }
              const text = parsed.content?.[0]?.text || ''
              if (parsed.usage) {
                const u = parsed.usage
                console.log(
                  `[Claude] in:${u.input_tokens} cache_read:${u.cache_read_input_tokens || 0}` +
                  ` cache_write:${u.cache_creation_input_tokens || 0} out:${u.output_tokens}`
                )
              }
              resolve(text)
            } catch (e) {
              reject(new Error(`[Claude] Failed to parse response: ${e.message}`))
            }
          })
        }
      )
      req.on('error', reject)
      req.write(body)
      req.end()
    })
  }
}

// ── node-llama-cpp provider ───────────────────────────────────────────────────

class NodeLlamaCppProvider {
  constructor(modelPath, options = {}) {
    this._modelPath    = modelPath
    this._options      = options
    this._model        = null
    this._context      = null
    this._session      = null
    this._ready        = false
    this._initPromise  = null
  }

  get name() { return `NodeLlamaCppProvider(${this._modelPath})` }

  isAvailable() { return this._ready }

  async init() {
    if (this._initPromise) return this._initPromise
    this._initPromise = this._doInit()
    return this._initPromise
  }

  async _doInit() {
    try {
      // node-llama-cpp is an ES module, so we must use a dynamic import.
      const { getLlama, LlamaChatSession } = await import('node-llama-cpp')
      const llama = await getLlama()

      this._model   = await llama.loadModel({ modelPath: this._modelPath })
      this._context = await this._model.createContext({
        contextSize: 2048,
      })
      this._LlamaChatSession = LlamaChatSession
      this._ready = true
      console.log(`[LLM] node-llama-cpp model loaded: ${this._modelPath}`)
    } catch (err) {
      this._ready = false
      console.warn(`[LLM] Failed to load node-llama-cpp model: ${err.message}`)
      throw err
    }
  }

  /**
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @param {Object} options  { maxTokens, chatHistory }
   *   chatHistory: Array<{ role: 'user'|'assistant', content: string }>
   *     When provided, prior turns are passed to LlamaChatSession via the
   *     model's real chat template instead of being embedded as raw text.
   * @returns {Promise<string>}
   */
  async complete(systemPrompt, userPrompt, options = {}) {
    if (!this._ready) throw new Error('LLMProvider not ready — call init() first')

    const maxTokens = options.maxTokens || 80

    // Translate caller-supplied history into node-llama-cpp's ChatHistoryItem[]
    // format so the model processes prior turns through its actual chat template.
    const chatHistory = (options.chatHistory || []).map(msg => (
      msg.role === 'user'
        ? { type: 'user',  text: msg.content }
        : { type: 'model', response: [msg.content] }
    ))

    // Create a fresh session per call so the model doesn't accumulate
    // cross-NPC context (each NPC response is stateless)
    const contextSequence = this._context.getSequence()
    const session = new this._LlamaChatSession({
      contextSequence,
      systemPrompt,
      ...(chatHistory.length > 0 ? { chatHistory } : {}),
    })

    const raw = await session.prompt(userPrompt, {
      maxTokens,
      temperature: 0.75,
      repeatPenalty: {
        lastTokens: 16,
        penalty: 1.2,
      },
    })

    contextSequence.dispose()

    // Debug: log raw model output before sanitization
    const sanitized = sanitizeModelOutput(raw)
    if (sanitized !== raw.trim()) {
      console.log(`[LLM] Raw output (${raw.length} chars): ${JSON.stringify(raw.slice(0, 300))}`)
      console.log(`[LLM] After sanitize (${sanitized.length} chars): ${JSON.stringify(sanitized.slice(0, 300))}`)
    }
    return sanitized
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/** Singleton provider — initialized once at server startup */
let _provider = null

/**
 * Get the active LLM provider. Lazy-initializes on first call.
 *
 * Selection via LLM_PROVIDER env var:
 *   "claude" → ClaudeAPIProvider  (requires ANTHROPIC_API_KEY)
 *   "local"  → NodeLlamaCppProvider (requires LLM_MODEL_PATH)
 *
 * @returns {Promise<ClaudeAPIProvider|NodeLlamaCppProvider>}
 */
async function getProvider() {
  if (_provider) return _provider

  const providerType = (process.env.LLM_PROVIDER || 'local').toLowerCase()

  if (providerType === 'claude') {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('[LLM] Critical: LLM_PROVIDER=claude but ANTHROPIC_API_KEY is not set')
    }
    _provider = new ClaudeAPIProvider()
    console.log(`[LLM] Using Claude API provider: ${_provider.name}`)
    return _provider
  }

  if (providerType === 'local') {
    const modelPath = process.env.LLM_MODEL_PATH
    if (!modelPath) throw new Error('[LLM] Critical: LLM_PROVIDER=local but LLM_MODEL_PATH is not set')
    const llmProvider = new NodeLlamaCppProvider(modelPath, { contextSize: 2048 })
    await llmProvider.init()
    _provider = llmProvider
    return _provider
  }

  throw new Error(`[LLM] Critical: Unknown LLM_PROVIDER value "${providerType}". Use "claude" or "local".`)
}

/**
 * Force a specific provider.
 * @param {MockLLMProvider|NodeLlamaCppProvider} provider
 */
function setProvider(provider) {
  _provider = provider
}

/** Reset to null so next call to getProvider() re-initializes */
function resetProvider() {
  _provider = null
}

module.exports = {
  getProvider,
  setProvider,
  resetProvider,
  ClaudeAPIProvider,
  NodeLlamaCppProvider,
  sanitizeModelOutput,
}
