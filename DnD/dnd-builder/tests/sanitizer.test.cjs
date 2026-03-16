'use strict'
const assert = require('assert')
const { sanitizeModelOutput } = require('../server/llm/LLMProvider')

// The exact bad output the user reported on first response
const bad1 = '<|assistant|> [INNER LIFE] Before this moment, you were thinking about: - The changed herbs. You contain these contradictions: She wants to understand mechanics. You contain these internal conflicts: She'
assert.strictEqual(sanitizeModelOutput(bad1), '', 'full system-prompt echo → empty string')

// System header in the middle of real dialogue
const bad2 = 'Hello, adventurer! [INNER LIFE] Before this moment...'
assert.strictEqual(sanitizeModelOutput(bad2), 'Hello, adventurer!', 'cuts at section header')

// [CONVERSATION SO FAR] header (second-response issue)
const bad3 = 'I see you there. [CONVERSATION SO FAR] Player: hello\nBree: Hi!'
assert.strictEqual(sanitizeModelOutput(bad3), 'I see you there.', 'cuts at CONVERSATION SO FAR')

// [ENCOUNTER MEMORY] and [PERMANENT GROWTH] headers
const bad4 = 'Indeed. [ENCOUNTER MEMORY] Trust level: 0.5.'
assert.strictEqual(sanitizeModelOutput(bad4), 'Indeed.', 'cuts at ENCOUNTER MEMORY')

// Chat template token prefix
const bad5 = '<|assistant|> How can I help you today?'
assert.strictEqual(sanitizeModelOutput(bad5), 'How can I help you today?', 'strips <|assistant|>')

// Wake-up prompt echo (first response)
const bad6 = 'Before responding, establish your inner state:\n- You are Bree.\nHello there.'
assert.ok(!sanitizeModelOutput(bad6).includes('Before responding'), 'strips wake-up preamble')

// Clean response passes through unchanged
const good = 'Hello, adventurer. What brings you to my shop today?'
assert.strictEqual(sanitizeModelOutput(good), good, 'clean output unchanged')

// Handles null/empty
assert.strictEqual(sanitizeModelOutput(''), '', 'empty string')
assert.strictEqual(sanitizeModelOutput(null), '', 'null')

console.log('All sanitizer tests passed.')
