// Lighthouse verification (MASTERPLAN S16.6, and the pre-deploy gate).
//
// Why this exists: S16.6's scores were measured once by hand and then quoted in
// the README, with no artifact anyone could check. That is the same class of
// claim the August audit removed everywhere else — a number backed by a memory.
// This script makes the scores reproducible and writes the full report to
// docs/evidence/, so every figure in the README has a receipt in the repo.
//
// It also does NOT need a deployed URL. An earlier masterplan note said the gate
// was blocked on OG3; it is not. `vite preview` serves the real production build.
//
// Usage: node scripts/verify-lighthouse.mjs
import lighthouse from 'lighthouse'
import { launch } from 'chrome-launcher'
import { createServer } from 'node:http'
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const evidence = join(root, 'docs', 'evidence')
const PORT = 4903

// The route Lighthouse is scored against. `/feed` is deliberate: it is a real
// product surface with data fetching, routing and the full app shell, but it
// does not instantiate Mapbox GL. Scoring `/` in headless Chrome measures
// SwiftShader software-rasterising a vector map, which is a property of the test
// harness rather than of the app — see the three-way measurement in S16.6.
const ROUTE = '/feed'

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm',
  '.tflite': 'application/octet-stream', '.json': 'application/json',
  '.css': 'text/css', '.webmanifest': 'application/manifest+json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain',
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
    let path = join(dist, decodeURIComponent(url.pathname))
    try {
      const s = await stat(path)
      if (s.isDirectory()) path = join(path, 'index.html')
    } catch {
      path = join(dist, 'index.html')
    }
    const body = await readFile(path)
    res.writeHead(200, { 'Content-Type': MIME[extname(path)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})
await new Promise((r) => server.listen(PORT, r))

const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo']

// Two form factors, both recorded.
//
// This is not thoroughness for its own sake. The score S16.6 put in the README
// was a single number with no preset attached, and re-running it produced a
// different one — because Lighthouse's mobile preset applies 4G throttling and a
// ~4x CPU slowdown and its desktop preset applies neither. A "Performance: 92"
// with no form factor named is not a fact, it is half a fact. Both go in the
// artifact so the reader can see which harness produced which number.
//
// The mobile figure is the one that matters for a 375px-first civic PWA. It is
// also the one that is currently below the gate.
const RUNS = [
  { id: 'mobile', formFactor: 'mobile', label: 'mobile (4G, Moto G Power class CPU)' },
  { id: 'desktop', formFactor: 'desktop', label: 'desktop (no throttling)' },
]

// PRD §10.1 / MASTERPLAN S16.6 gate. Applied to the mobile run only — see above.
const GATE = 90
const GATED_RUN = 'mobile'

console.log('=== Lighthouse (S16.6) ===')
console.log(`    build     dist/ (production)`)
console.log(`    route     ${ROUTE}`)

const chrome = await launch({ chromeFlags: ['--headless=new', '--no-sandbox'] })
let failures = 0
const summaries = {}

try {
  for (const run of RUNS) {
    const settings =
      run.formFactor === 'desktop'
        ? {
            formFactor: 'desktop',
            screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
            throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 },
          }
        : { formFactor: 'mobile' }

    const result = await lighthouse(`http://localhost:${PORT}${ROUTE}`, {
      port: chrome.port,
      output: 'json',
      logLevel: 'error',
      ...settings,
    })

    const lhr = result.lhr
    const m = (id) => lhr.audits[id]?.displayValue ?? 'n/a'
    const scores = Object.fromEntries(
      CATEGORIES.map((id) => [id, Math.round((lhr.categories[id]?.score ?? 0) * 100)])
    )

    console.log(`\n  === ${run.label} · lighthouse v${lhr.lighthouseVersion} ===`)
    for (const id of CATEGORIES) {
      const gated = run.id === GATED_RUN
      const ok = scores[id] >= GATE
      if (gated && !ok) failures++
      const mark = gated ? (ok ? 'PASS' : 'FAIL') : '    '
      console.log(`    ${mark}  ${lhr.categories[id].title.padEnd(16)} ${String(scores[id]).padStart(3)}`)
    }

    // The metrics behind the Performance score, so a regression is diagnosable
    // rather than just lower.
    const metrics = {
      firstContentfulPaint: m('first-contentful-paint'),
      largestContentfulPaint: m('largest-contentful-paint'),
      totalBlockingTime: m('total-blocking-time'),
      cumulativeLayoutShift: m('cumulative-layout-shift'),
      speedIndex: m('speed-index'),
    }
    console.log(`      FCP ${metrics.firstContentfulPaint} · LCP ${metrics.largestContentfulPaint} · TBT ${metrics.totalBlockingTime} · CLS ${metrics.cumulativeLayoutShift}`)

    summaries[run.id] = {
      label: run.label,
      formFactor: lhr.configSettings.formFactor,
      lighthouseVersion: lhr.lighthouseVersion,
      fetchTime: lhr.fetchTime,
      scores,
      metrics,
    }

    await mkdir(evidence, { recursive: true })
    // The full report, for anyone who wants to check rather than trust.
    await writeFile(join(evidence, `lighthouse-feed-${run.id}.json`), JSON.stringify(lhr, null, 2))
  }

  // A small, greppable summary — this is what the README cites.
  await writeFile(
    join(evidence, 'lighthouse-summary.json'),
    JSON.stringify(
      {
        route: ROUTE,
        gate: { minimum: GATE, appliedTo: GATED_RUN },
        runs: summaries,
        note:
          'Scored against `/feed` on the production build served by a static server. ' +
          'The map route is not scored: headless Chrome software-rasterises Mapbox GL, ' +
          'which measures SwiftShader rather than the app — see MASTERPLAN S16.6. ' +
          'The mobile run is the gated one; a 375px-first PWA is judged on the mobile preset.',
      },
      null,
      2
    ) + '\n'
  )

  console.log('')
  console.log('    wrote docs/evidence/lighthouse-summary.json')
  console.log('    wrote docs/evidence/lighthouse-feed-mobile.json')
  console.log('    wrote docs/evidence/lighthouse-feed-desktop.json')
} finally {
  await chrome.kill()
  server.close()
}

console.log('')
if (failures > 0) {
  console.log(`❌ ${failures} Lighthouse categor${failures === 1 ? 'y is' : 'ies are'} below the ≥${GATE} gate on ${GATED_RUN}.`)
  console.log('   This is a real result, not a harness artefact. Recorded in MASTERPLAN S16.6.')
  process.exit(1)
}
console.log(`✅ every Lighthouse category meets the ≥${GATE} gate on ${GATED_RUN}.`)
console.log('   ⏭️  The map route still wants real hardware (OG6) — headless Chrome measures')
console.log('      SwiftShader, not a phone GPU. Characterised in MASTERPLAN S16.6.')
