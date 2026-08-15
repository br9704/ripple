// Captures the README screenshots from the real production build.
//
// Why a script rather than hand-taken stills: MOTION.md:102 requires every
// animated state to have a static equivalent "for reduced-motion and for
// screenshots", and a README image that nobody can regenerate drifts away from
// the product silently. This runs against dist/ in a real iPhone-class viewport,
// so what is in docs/media/ is always something the build actually produced.
//
// Runs with `prefers-reduced-motion: reduce` so nothing is caught mid-transition.
//
// Usage: node scripts/capture-screenshots.mjs
import { webkit, devices } from 'playwright'
import { createServer } from 'node:http'
import { readFile, stat, mkdir } from 'node:fs/promises'
import { join, dirname, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const media = join(root, 'docs', 'media')
const PORT = 4904

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

const SHOTS = [
  { name: 'map', path: '/', settle: 4000 },
  { name: 'report', path: '/report', settle: 2000 },
  { name: 'feed', path: '/feed', settle: 2000 },
  { name: 'offline', path: '/offline.html', settle: 800 },
]

await mkdir(media, { recursive: true })

const browser = await webkit.launch()
const context = await browser.newContext({
  ...devices['iPhone 14'],
  reducedMotion: 'reduce',
  colorScheme: 'dark',
})
const page = await context.newPage()

console.log('=== capturing README media (iPhone 14, WebKit, reduced-motion) ===')
for (const shot of SHOTS) {
  await page.goto(`http://localhost:${PORT}${shot.path}`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(shot.settle)
  const out = join(media, `${shot.name}.png`)
  await page.screenshot({ path: out })
  console.log(`  wrote docs/media/${shot.name}.png  (${shot.path})`)
}

await browser.close()
server.close()
console.log('\n✅ screenshots captured from dist/.')
