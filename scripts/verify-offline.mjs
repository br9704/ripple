// Verifies offline classification (MASTERPLAN S7.14).
//
// The claim under test is PRD §10.5's: once the model has been fetched, the
// classifier works with no network at all. Previously unverifiable because
// there was no model to cache; there is one now (scripts/fetch-dev-model.mjs).
//
// Method: serve the production build, let the service worker warm its caches,
// then cut the network at the browser level and confirm the model and WASM
// runtime still resolve from Cache Storage.
//
// Usage: node scripts/verify-offline.mjs
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const PORT = 4901

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.wasm': 'application/wasm', '.tflite': 'application/octet-stream',
  '.json': 'application/json', '.css': 'text/css', '.webmanifest': 'application/manifest+json',
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
      path = join(dist, 'index.html') // SPA fallback
    }
    const body = await readFile(path)
    res.writeHead(200, {
      'Content-Type': MIME[extname(path)] ?? 'application/octet-stream',
      'Content-Length': body.byteLength,
    })
    res.end(body)
  } catch {
    res.writeHead(404).end('not found')
  }
})

await new Promise((r) => server.listen(PORT, r))

let failures = 0
const check = (cond, label, detail = '') => {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

const browser = await chromium.launch({ args: ['--no-sandbox'] })
const context = await browser.newContext()
const page = await context.newPage()

console.log('=== offline capability (S7.14, PRD §10.5) ===')

await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'load' })

// Wait for the service worker to take control.
const swReady = await page
  .waitForFunction(
    () => navigator.serviceWorker?.controller !== null || navigator.serviceWorker?.ready,
    null,
    { timeout: 20000 }
  )
  .then(() => true)
  .catch(() => false)
check(swReady, 'service worker registers and activates')

await page.evaluate(() => navigator.serviceWorker.ready)

// Warm the caches the classifier depends on. In the app this happens when the
// user first opens the camera; here we do it explicitly so the test is about
// the CACHE, not about the UI path that triggers it.
const warmed = await page.evaluate(async () => {
  const model = await fetch('/models/ripple-classifier-v1.tflite')
  const wasm = await fetch('/litert-wasm/litert_wasm_internal.wasm')
  return { model: model.ok, modelBytes: (await model.arrayBuffer()).byteLength, wasm: wasm.ok }
})
check(warmed.model, 'model fetches while online', `${(warmed.modelBytes / 1024 / 1024).toFixed(2)}MB`)
check(warmed.wasm, 'WASM runtime fetches while online')

// Give the service worker a moment to write its runtime caches.
await page.waitForTimeout(2500)

const cacheNames = await page.evaluate(() => caches.keys())
check(
  cacheNames.some((n) => n.includes('ripple-ai-model')),
  'a dedicated model cache exists',
  cacheNames.join(', ')
)
check(
  cacheNames.some((n) => n.includes('ripple-litert-runtime')),
  'a dedicated runtime cache exists'
)

// ── Service-worker-controlled navigation ──
//
// Added Aug 2026 after this exact case shipped broken and no gate caught it.
// `navigateFallback` was set to '/offline.html', and a workbox NavigationRoute
// matches EVERY navigation request — so with the service worker in control,
// every route except '/' served "You're offline right now" to an ONLINE user.
// It survived because '/' matches the precached index.html route directly, and
// because client-side <Link> navigation issues no navigation request at all.
// What it broke was every path a stranger arrives by: a shared report link, a
// shareable filtered view, a reload, a standalone PWA launch.
//
// Static analysis of the built sw.js could not see this; only driving a real
// browser through a real navigation with the worker in control could.
const ROUTES = ['/', '/report', '/feed', '/my-reports', '/search']

/** True when the document is Ripple's app shell rather than the offline page. */
async function rendersAppShell(path) {
  await page.goto(`http://localhost:${PORT}${path}`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.waitForTimeout(400)
  return page.evaluate(() => {
    const offlinePage = document.body.textContent.includes("You're offline right now")
    const root = document.querySelector('#root')
    return !offlinePage && !!root && root.children.length > 0
  })
}

console.log('  --- service-worker-controlled navigation (online) ---')
for (const route of ROUTES) {
  check(await rendersAppShell(route), `${route} serves the app, not the offline page`)
}

// ── Cut the network ──
await context.setOffline(true)
console.log('  --- network offline ---')

const offlineResult = await page.evaluate(async () => {
  const out = { model: false, modelBytes: 0, wasm: false, error: null }
  try {
    const model = await fetch('/models/ripple-classifier-v1.tflite')
    out.model = model.ok
    out.modelBytes = (await model.arrayBuffer()).byteLength
    const wasm = await fetch('/litert-wasm/litert_wasm_internal.wasm')
    out.wasm = wasm.ok
  } catch (e) {
    out.error = e?.message ?? String(e)
  }
  return out
})

check(offlineResult.model, 'model still resolves OFFLINE from Cache Storage', offlineResult.error ?? '')
check(
  offlineResult.modelBytes === warmed.modelBytes,
  'cached model is byte-identical to the network copy',
  `${offlineResult.modelBytes} vs ${warmed.modelBytes}`
)
check(offlineResult.wasm, 'WASM runtime still resolves OFFLINE')

// The app shell itself must still render — CLAUDE.md §4: offline is not an
// error state, and a blank screen is a bug.
const shellOk = await page
  .reload({ waitUntil: 'domcontentloaded', timeout: 15000 })
  .then(() => page.evaluate(() => document.body.textContent.trim().length > 0))
  .catch(() => false)
check(shellOk, 'app shell still renders offline (not a browser error page)')

// The point of an offline-first PWA is that a deep link works on a train too.
// index.html is precached, so the shell must render for any route with no
// network at all — CLAUDE.md §4, "offline is not an error state".
for (const route of ROUTES.filter((r) => r !== '/')) {
  check(await rendersAppShell(route), `${route} renders from cache with no network`)
}

await context.setOffline(false)
await browser.close()
server.close()

console.log()
if (failures > 0) {
  console.log(`❌ ${failures} offline check(s) failed`)
  process.exit(1)
}
console.log('✅ classification assets are fully available offline.')
console.log('   The model is cached, byte-identical, and served with no network.')
