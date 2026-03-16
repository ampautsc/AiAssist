/**
 * Quick comparison script for simulation run results.
 * Usage: node server/compare-runs.js <prevId> <latestId>
 */
'use strict'
try { require('dotenvx').config({ quiet: true }) } catch { require('dotenv').config() }
const { MongoClient, ObjectId } = require('mongodb')

async function main() {
  const [prevId, latestId] = process.argv.slice(2)
  if (!prevId || !latestId) {
    console.error('Usage: node server/compare-runs.js <prevRecordId> <latestRecordId>')
    process.exit(1)
  }

  const client = await MongoClient.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017')
  const col = client.db('dnd-builder').collection('scenarioevaluations')

  const prev = await col.findOne({ _id: new ObjectId(prevId) })
  const latest = await col.findOne({ _id: new ObjectId(latestId) })
  if (!prev || !latest) { console.error('Record not found'); process.exit(1) }

  const pScen = prev.results.scenarioResults
  const lScen = latest.results.scenarioResults

  console.log('\n════════════════════════════════════════════════════════════════')
  console.log('  SCENARIO-LEVEL COMPARISON')
  console.log('  Previous:', prevId, `(${prev.computedAt})`)
  console.log('  Latest:  ', latestId, `(${latest.computedAt})`)
  console.log('════════════════════════════════════════════════════════════════\n')

  let grandPW = 0, grandPS = 0, grandPT = 0
  let grandLW = 0, grandLS = 0, grandLT = 0

  for (const lEntry of lScen) {
    const pEntry = pScen.find(s => s.id === lEntry.id)
    const lr = lEntry.rankings
    const pr = pEntry ? pEntry.rankings : []

    const lWins = lr.reduce((a, b) => a + b.victories, 0)
    const lStale = lr.reduce((a, b) => a + b.stalemates, 0)
    const lSims = lr.reduce((a, b) => a + b.simulations, 0)
    const lDefeats = lr.reduce((a, b) => a + b.defeats, 0)
    const pWins = pr.reduce((a, b) => a + b.victories, 0)
    const pStale = pr.reduce((a, b) => a + b.stalemates, 0)
    const pSims = pr.reduce((a, b) => a + b.simulations, 0)

    grandPW += pWins; grandPS += pStale; grandPT += pSims
    grandLW += lWins; grandLS += lStale; grandLT += lSims

    const pct = (n, d) => d ? (n / d * 100).toFixed(1) + '%' : '0%'
    console.log(`${lEntry.name}:`)
    console.log(`  Wins:      ${pWins}/${pSims} (${pct(pWins, pSims)})  →  ${lWins}/${lSims} (${pct(lWins, lSims)})`)
    console.log(`  Stalemates: ${pStale} (${pct(pStale, pSims)})  →  ${lStale} (${pct(lStale, lSims)})`)
    console.log(`  Defeats:   ${pSims - pWins - pStale}  →  ${lDefeats}`)

    // Top 3 winning builds
    const topBuilds = [...lr].sort((a, b) => b.winRate - a.winRate).slice(0, 3)
    if (topBuilds[0]?.victories > 0) {
      console.log(`  Top builds:`)
      for (const b of topBuilds) {
        if (b.victories === 0) break
        console.log(`    ${b.build}: ${b.victories}/${b.simulations} wins (${b.winRate}%), ${b.stalemates} stale, fly=${b.canFly}`)
      }
    }
    console.log()
  }

  console.log('════════════════════════════════════════════════════════════════')
  const pct = (n, d) => d ? (n / d * 100).toFixed(2) + '%' : '0%'
  console.log(`GRAND TOTAL (${grandLT} encounters):`)
  console.log(`  Wins:      ${grandPW} (${pct(grandPW, grandPT)})  →  ${grandLW} (${pct(grandLW, grandLT)})`)
  console.log(`  Stalemates: ${grandPS} (${pct(grandPS, grandPT)})  →  ${grandLS} (${pct(grandLS, grandLT)})`)
  console.log('════════════════════════════════════════════════════════════════')

  // Top 10 builds overall by avgScore
  const buildMap = new Map()
  for (const scen of lScen) {
    for (const r of scen.rankings) {
      if (!buildMap.has(r.build)) buildMap.set(r.build, [])
      buildMap.get(r.build).push(r)
    }
  }
  const ranked = [...buildMap.entries()].map(([build, results]) => {
    const totalWins = results.reduce((a, r) => a + r.victories, 0)
    const totalSims = results.reduce((a, r) => a + r.simulations, 0)
    const avgScore = results.reduce((a, r) => a + (r.score || 0), 0) / results.length
    return { build, totalWins, totalSims, winRate: totalWins / totalSims * 100, avgScore }
  }).sort((a, b) => b.avgScore - a.avgScore)

  console.log('\nTop 10 builds by average score:')
  for (let i = 0; i < Math.min(10, ranked.length); i++) {
    const b = ranked[i]
    console.log(`  ${i + 1}. ${b.build}: avg ${b.avgScore.toFixed(1)}, wins ${b.totalWins}/${b.totalSims} (${b.winRate.toFixed(1)}%)`)
  }

  await client.close()
}

main()
