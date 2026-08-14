// Measures real on-device classification latency (MASTERPLAN S7.13).
//
// The masterplan said this was blocked on hardware. It is blocked on
// REPRESENTATIVE hardware — a mid-range Android — but not on measurement
// itself. Running the actual LiteRT WASM runtime against the actual .tflite in
// a real browser produces a real number, and a real number with a stated
// caveat beats an unmeasured budget.
//
// What this measures: model fetch + compile, then N inference passes, p50/p95,
// against the 3,000ms MOTION.md budget.
// What it does not measure: a mid-range Android. This machine is far faster,
// so treat the result as a LOWER BOUND — the floor the phone cannot beat.
//
// Usage: node scripts/bench-inference.mjs [runs]
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const RUNS = Number(process.argv[2] ?? 20)
const PORT = 4899

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.wasm': 'application/wasm', '.tflite': 'application/octet-stream',
  '.json': 'application/json', '.css': 'text/css',
}

// Serve public/ directly — no build needed, and it keeps the harness honest
// about which files the browser actually fetches.
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)

    // A real page is required: on about:blank a relative dynamic import has no
    // base URL to resolve against, so the harness must actually navigate.
    if (url.pathname === '/') {
      // @litertjs/core's ESM build imports '@litertjs/wasm-utils' as a bare
      // specifier, which a browser cannot resolve without a map. Vite rewrites
      // these at build time; this harness loads the raw dist, so it maps them.
      const html = [
        '<!doctype html><meta charset="utf-8"><title>bench</title>',
        '<script type="importmap">',
        JSON.stringify({
          imports: {
            '@litertjs/core': '/litert-wasm/dist/index.js',
            '@litertjs/wasm-utils': '/litert-wasm/wasm-utils/index.js',
            '@litertjs/wasm-utils/': '/litert-wasm/wasm-utils/',
          },
        }),
        '<\/script><body>bench</body>',
      ].join('')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(html)
      return
    }

    const path = join(root, 'public', decodeURIComponent(url.pathname))
    await stat(path)
    const body = await readFile(path)
    res.writeHead(200, {
      'Content-Type': MIME[extname(path)] ?? 'application/octet-stream',
      'Content-Length': body.byteLength,
      // Real Content-Length matters: the loader reports null progress without it.
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})

await new Promise((r) => server.listen(PORT, r))

const browser = await chromium.launch({
  args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage()
page.on('console', (m) => {
  if (m.type() === 'error') console.error('  [browser]', m.text().slice(0, 160))
})

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' }).catch(() => {})

const result = await page.evaluate(async (runs) => {
  const t0 = performance.now()
  // Served from public/litert-wasm/dist by the harness (see the copy step in
  // the runner) so the browser can import the real ESM build.
  let core
  try {
    core = await import('/litert-wasm/dist/index.js')
  } catch (e) {
    return { error: 'import failed: ' + (e?.message ?? String(e)) }
  }

  try {
    await core.loadLiteRt('/litert-wasm/')
  } catch (e) {
    return { error: 'loadLiteRt failed: ' + (e?.message ?? String(e)) }
  }
  const runtimeMs = performance.now() - t0

  const fetchStart = performance.now()
  const res = await fetch('/models/ripple-classifier-v1.tflite')
  const bytes = new Uint8Array(await res.arrayBuffer())
  const fetchMs = performance.now() - fetchStart

  const accelerator = core.isWebGPUSupported?.() ? 'webgpu' : 'wasm'

  const compileStart = performance.now()
  let model
  try {
    model = await core.loadAndCompile(bytes, { accelerator })
  } catch {
    model = await core.loadAndCompile(bytes, { accelerator: 'wasm' })
  }
  const compileMs = performance.now() - compileStart

  const details = model.getInputDetails()
  const shape = details[0].shape
  const size = shape.length >= 3 ? Number(shape[1]) : 224
  const dtype = String(details[0].dtype ?? '')

  // Synthetic input of the exact declared shape and type.
  const count = size * size * 3
  const input = dtype.toLowerCase().includes('int8')
    ? new Uint8Array(count).fill(128)
    : new Float32Array(count).fill(0.5)

  const times = []
  for (let i = 0; i < runs; i++) {
    const t = performance.now()
    const tensor = core.Tensor.fromTypedArray(input, [1, size, size, 3])
    const out = await model.run(tensor)
    await out[0].data()
    times.push(performance.now() - t)
  }

  times.sort((a, b) => a - b)
  const pct = (p) => times[Math.min(times.length - 1, Math.floor((p / 100) * times.length))]

  return {
    accelerator, inputSize: size, dtype,
    modelBytes: bytes.byteLength,
    runtimeMs, fetchMs, compileMs,
    p50: pct(50), p95: pct(95),
    min: times[0], max: times[times.length - 1],
    runs: times.length,
  }
}, RUNS)

await browser.close()
server.close()

if (result.error) {
  console.error('❌', result.error)
  process.exit(1)
}

const f = (n) => `${n.toFixed(0)}ms`.padStart(8)
console.log('=== on-device inference benchmark (S7.13) ===')
console.log(`  accelerator     ${result.accelerator}`)
console.log(`  input           ${result.inputSize}x${result.inputSize} ${result.dtype}`)
console.log(`  model size      ${(result.modelBytes / 1024 / 1024).toFixed(2)}MB`)
console.log()
console.log(`  runtime load  ${f(result.runtimeMs)}   (once per session)`)
console.log(`  model fetch   ${f(result.fetchMs)}   (once, then cached)`)
console.log(`  compile       ${f(result.compileMs)}   (once per session)`)
console.log()
console.log(`  inference p50 ${f(result.p50)}`)
console.log(`  inference p95 ${f(result.p95)}   over ${result.runs} runs`)
console.log(`  min / max     ${f(result.min)} /${f(result.max)}`)
console.log()

const BUDGET = 3000
const worstCold = result.runtimeMs + result.fetchMs + result.compileMs + result.p95
console.log(`  warm capture→result (p95)  ${f(result.p95)}  vs ${BUDGET}ms budget`)
console.log(`  cold first-ever run        ${f(worstCold)}  (runtime + fetch + compile + inference)`)
console.log()
console.log(result.p95 < BUDGET ? '✅ warm path is inside the MOTION.md budget' : '❌ warm path exceeds budget')
console.log('⚠️  Measured on this machine, not a mid-range Android. Treat as a LOWER BOUND.')
