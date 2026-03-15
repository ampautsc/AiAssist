/**
 * download-model.js — One-time setup script to download the embedded LLM model.
 *
 * Downloads phi-3.5-mini-instruct Q4_K_M quantized GGUF from Hugging Face.
 * Model size: ~2.2 GB.
 *
 * Usage:
 *   node scripts/download-model.js
 *   node scripts/download-model.js --model tinyllama    (smaller, ~600MB, lower quality)
 *
 * After download, add to your .env:
 *   LLM_MODEL_PATH=./models/phi-3.5-mini-instruct-Q4_K_M.gguf
 */

'use strict'

const https   = require('https')
const http    = require('http')
const fs      = require('fs')
const path    = require('path')

// ── Model registry ─────────────────────────────────────────────────────────────

const MODELS = {
  phi35mini: {
    name:     'phi-3.5-mini-instruct-Q4_K_M.gguf',
    url:      'https://huggingface.co/bartowski/Phi-3.5-mini-instruct-GGUF/resolve/main/Phi-3.5-mini-instruct-Q4_K_M.gguf',
    sizeMB:   2200,
    envKey:   'LLM_MODEL_PATH',
    quality:  'best — strong instruction-following, recommended for character dialogue',
  },
  tinyllama: {
    name:     'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    url:      'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    sizeMB:   600,
    envKey:   'LLM_MODEL_PATH',
    quality:  'smaller/faster — lower quality, good for testing on limited hardware',
  },
}

// ── Arg parsing ────────────────────────────────────────────────────────────────

const args      = process.argv.slice(2)
const modelKey  = (args.find(a => a.startsWith('--model='))?.split('=')[1])
               || (args[args.indexOf('--model') + 1])
               || 'phi35mini'

const model = MODELS[modelKey]
if (!model) {
  console.error(`Unknown model key: ${modelKey}. Available: ${Object.keys(MODELS).join(', ')}`)
  process.exit(1)
}

// ── Target path ────────────────────────────────────────────────────────────────

const MODELS_DIR  = path.resolve(__dirname, '../models')
const TARGET_PATH = path.join(MODELS_DIR, model.name)

if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true })
  console.log(`Created directory: ${MODELS_DIR}`)
}

if (fs.existsSync(TARGET_PATH)) {
  const statsBytes = fs.statSync(TARGET_PATH).size
  const statsMB    = Math.round(statsBytes / 1024 / 1024)
  console.log(`Model already exists: ${TARGET_PATH} (${statsMB} MB)`)
  console.log(`Add to .env: LLM_MODEL_PATH=./models/${model.name}`)
  process.exit(0)
}

// ── Download with progress ────────────────────────────────────────────────────

console.log(`\nDownloading: ${model.name}`)
console.log(`Quality:     ${model.quality}`)
console.log(`Est. size:   ~${model.sizeMB} MB`)
console.log(`URL:         ${model.url}`)
console.log(`Destination: ${TARGET_PATH}`)
console.log('')

function download(url, dest, attempt = 1) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http
    const file  = fs.createWriteStream(dest)

    let downloaded = 0
    let total      = 0
    let lastPct    = -1

    const req = proto.get(url, res => {
      // Follow redirects (Hugging Face uses these)
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
        file.close()
        fs.unlinkSync(dest)
        console.log(`Redirecting to: ${res.headers.location}`)
        return download(res.headers.location, dest, attempt).then(resolve).catch(reject)
      }

      if (res.statusCode !== 200) {
        file.close()
        fs.unlinkSync(dest)
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
      }

      total = parseInt(res.headers['content-length'] || '0', 10)

      res.on('data', chunk => {
        downloaded += chunk.length
        if (total > 0) {
          const pct = Math.floor((downloaded / total) * 100)
          if (pct !== lastPct && pct % 5 === 0) {
            const mb = Math.round(downloaded / 1024 / 1024)
            process.stdout.write(`\r  Progress: ${pct}% (${mb} MB)    `)
            lastPct = pct
          }
        }
      })

      res.pipe(file)

      file.on('finish', () => {
        file.close()
        process.stdout.write('\n')
        resolve()
      })
    })

    req.on('error', err => {
      file.close()
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      reject(err)
    })

    req.setTimeout(60000, () => {
      req.destroy()
      file.close()
      if (fs.existsSync(dest)) fs.unlinkSync(dest)
      reject(new Error('Connection timed out'))
    })
  })
}

download(model.url, TARGET_PATH)
  .then(() => {
    const statsBytes = fs.statSync(TARGET_PATH).size
    const statsMB    = Math.round(statsBytes / 1024 / 1024)
    console.log(`\n✓ Downloaded: ${TARGET_PATH} (${statsMB} MB)`)
    console.log('\nNext steps:')
    console.log(`  1. npm install node-llama-cpp   (from dnd-builder root)`)
    console.log(`  2. Add to .env: LLM_MODEL_PATH=./models/${model.name}`)
    console.log('  3. Restart the server'); process.exit(0)
  })
  .catch(err => {
    console.error(`\nDownload failed: ${err.message}`)
    if (fs.existsSync(TARGET_PATH)) fs.unlinkSync(TARGET_PATH)
    process.exit(1)
  })
