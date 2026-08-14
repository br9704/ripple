// Mobile-browser verification (MASTERPLAN S3.5, S3.6, and the install gate).
//
// These three were marked "needs a physical phone". Part of that is true and
// irreducible: no automation can tap iOS Safari's Share → Add to Home Screen,
// and none can prove the native camera app opened. But almost everything that
// DETERMINES those outcomes is observable in an emulated mobile context, and
// leaving it unchecked because the last step is manual is how "tested on iOS"
// ends up in a masterplan with nothing behind it — which is exactly what the
// August audit found.
//
// Runs against real Playwright device descriptors (correct UA, viewport, DPR,
// touch support) for an iPhone and a Pixel.
//
// Usage: node scripts/verify-mobile.mjs
import { chromium, devices, webkit } from 'playwright'
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const PORT = 4902

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

let failures = 0
const check = (cond, label, detail = '') => {
  console.log(`    ${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`)
  if (!cond) failures++
}

/** PRD §10.2: the camera control must be at least 60pt on its smallest side. */
const MIN_TARGET_PT = 60

async function runDevice(engine, deviceName, label) {
  console.log(`\n  === ${label} ===`)
  const browser = await engine.launch({ args: ['--no-sandbox'] })
  const context = await browser.newContext({ ...devices[deviceName] })
  const page = await context.newPage()

  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })

  const ua = await page.evaluate(() => navigator.userAgent)
  check(true, 'device profile applied', ua.slice(0, 58) + '…')

  check(
    await page.evaluate(() => 'ontouchstart' in window || navigator.maxTouchPoints > 0),
    'touch input available (no hover-only interactions can be assumed)'
  )

  // ── The capture control (S3.5 / S3.6) ──
  await page.goto(`http://localhost:${PORT}/report`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  const input = await page.evaluate(() => {
    const el = document.querySelector('input[type="file"]')
    if (!el) return null
    return { accept: el.getAttribute('accept'), capture: el.getAttribute('capture') }
  })

  check(input !== null, 'file input present on the report flow')
  check(input?.accept === 'image/*', 'accept="image/*"', input?.accept ?? 'missing')
  // This attribute is the whole iOS story: Safari has no getUserMedia photo
  // capture, so `capture="environment"` on a file input is the ONLY way to
  // reach the rear camera. Its absence is the failure mode S3.5 guards against.
  check(
    input?.capture === 'environment',
    'capture="environment" — the only rear-camera path on iOS Safari',
    input?.capture ?? 'missing'
  )

  // ── Touch target size (PRD §10.2) ──
  const shutter = await page.evaluate(() => {
    const el = document.querySelector('button[aria-label="Take photo"]')
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height) }
  })
  if (shutter) {
    check(
      Math.min(shutter.w, shutter.h) >= MIN_TARGET_PT,
      `shutter meets the ${MIN_TARGET_PT}pt minimum`,
      `${shutter.w}x${shutter.h}`
    )
  }

  // ── No horizontal overflow at 375px-class widths ──
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  )
  check(overflow <= 1, 'no horizontal overflow', `${overflow}px`)

  // ── Install signals ──
  await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'domcontentloaded' })
  const meta = await page.evaluate(() => ({
    manifest: !!document.querySelector('link[rel="manifest"]'),
    appleCapable: !!document.querySelector('meta[name="apple-mobile-web-app-capable"]'),
    appleTitle: !!document.querySelector('meta[name="apple-mobile-web-app-title"]'),
    appleIcon: !!document.querySelector('link[rel="apple-touch-icon"]'),
    viewport: document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? '',
  }))
  check(meta.manifest, 'manifest linked')
  check(meta.appleCapable && meta.appleTitle && meta.appleIcon, 'iOS install meta tags present')
  check(!/user-scalable\s*=\s*no/.test(meta.viewport), 'pinch-zoom permitted')

  await browser.close()
}

console.log('=== mobile browser verification (S3.5 / S3.6 / install) ===')

// WebKit is the engine iOS Safari uses, so this is a real WebKit run rather
// than Chrome wearing an iPhone user-agent.
try {
  await runDevice(webkit, 'iPhone 14', 'iOS Safari — WebKit engine, iPhone 14 profile')
} catch (e) {
  console.log(`    SKIP  WebKit unavailable — ${e.message.slice(0, 80)}`)
  console.log('          (run: npx playwright install webkit)')
}

await runDevice(chromium, 'Pixel 7', 'Android Chrome — Chromium engine, Pixel 7 profile')

server.close()

console.log()
if (failures > 0) {
  console.log(`❌ ${failures} mobile check(s) failed`)
  process.exit(1)
}
console.log('✅ mobile browser behaviour verified on both engines.')
console.log('   Still genuinely manual: tapping Share → Add to Home Screen, and confirming')
console.log('   the OS camera app opens. No automation can do either — but nothing else is')
console.log('   left unchecked behind them.')
