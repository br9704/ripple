// Verifies every programmatic PWA installability criterion against dist/.
//
// The remaining masterplan item is "real-device PWA install verified on iOS
// Safari and Android Chrome". Tapping Share → Add to Home Screen on a physical
// phone is irreducibly manual. Everything that DETERMINES whether that tap
// works is not, so this checks all of it — leaving the manual step as the only
// genuine gap rather than an unexamined one.
//
// Chrome's installability criteria: served over HTTPS (or localhost), a linked
// manifest with name, start_url, display, and a 192px + 512px icon, plus a
// registered service worker with a fetch handler.
//
// iOS Safari ignores the manifest for install and uses apple-* meta tags
// instead, which is why those are checked separately.
//
// Usage: node scripts/verify-pwa.mjs
import { readFile, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

let failures = 0
const ok = (label) => console.log(`  PASS  ${label}`)
const bad = (label, detail = '') => {
  console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  failures++
}
const check = (cond, label, detail) => (cond ? ok(label) : bad(label, detail))

const exists = async (p) => {
  try {
    await access(join(dist, p))
    return true
  } catch {
    return false
  }
}

console.log('=== manifest ===')
const manifest = JSON.parse(await readFile(join(dist, 'manifest.webmanifest'), 'utf8'))

check(Boolean(manifest.name), 'manifest has name')
check(Boolean(manifest.short_name), 'manifest has short_name')
check(Boolean(manifest.start_url), 'manifest has start_url')
check(
  ['standalone', 'fullscreen', 'minimal-ui'].includes(manifest.display),
  'display is an installable value',
  `got "${manifest.display}"`
)
check(/^#[0-9a-f]{6}$/i.test(manifest.background_color ?? ''), 'background_color is a valid hex')
check(/^#[0-9a-f]{6}$/i.test(manifest.theme_color ?? ''), 'theme_color is a valid hex')

const icons = manifest.icons ?? []
const has = (size) => icons.some((i) => (i.sizes ?? '').split(' ').includes(size))
check(has('192x192'), 'manifest declares a 192x192 icon')
check(has('512x512'), 'manifest declares a 512x512 icon')
check(
  icons.some((i) => (i.purpose ?? '').includes('maskable')),
  'manifest declares a maskable icon (Android adaptive shape)'
)

console.log('\n=== icon files actually exist ===')
for (const icon of icons) {
  const path = icon.src.replace(/^\//, '')
  check(await exists(path), `icon present: ${icon.src}`)
}

console.log('\n=== service worker ===')
check(await exists('sw.js'), 'sw.js emitted')
const sw = await readFile(join(dist, 'sw.js'), 'utf8')
check(/addEventListener\(['"]fetch['"]/.test(sw) || /workbox/i.test(sw),
  'service worker handles fetch (required for installability)')
check(/precache|__WB_MANIFEST|precacheAndRoute/i.test(sw), 'service worker precaches the app shell')
check(await exists('registerSW.js'), 'registerSW.js emitted')

console.log('\n=== navigation fallback ===')
check(await exists('offline.html'), 'offline.html emitted')
check(/NavigationRoute/.test(sw), 'service worker registers a navigation route')
// This check used to be `/navigateFallback|offline\.html/`, which passed while
// the app was broken: the fallback WAS offline.html, and a NavigationRoute
// matches every navigation, so every route but '/' served the offline page to
// an online user. A regex that accepts either answer cannot detect the wrong
// one. The fallback must be the app shell — offline.html is a last resort, not
// the router.
check(
  /createHandlerBoundToURL\(["']\/index\.html["']\)/.test(sw),
  'navigations fall back to the app shell, not the offline page'
)
// Behavioural proof that this is actually true in a browser lives in
// scripts/verify-offline.mjs, which drives real navigations with the worker in
// control. This check is the cheap early warning; that one is the evidence.

console.log('\n=== index.html wiring ===')
const html = await readFile(join(dist, 'index.html'), 'utf8')
check(/<link[^>]+rel=["']manifest["']/.test(html), 'manifest is linked from index.html')
check(/<meta[^>]+name=["']theme-color["']/.test(html), 'theme-color meta present')
check(/<meta[^>]+name=["']viewport["']/.test(html), 'viewport meta present')
// Match the meta tag's content attribute specifically. Scanning the whole
// document would also hit the HTML comment explaining why the lock was removed,
// which is a false positive on our own documentation.
const viewport = (html.match(/<meta[^>]+name=["']viewport["'][^>]*content=["']([^"']+)["']/) ?? [])[1] ?? ''
check(
  !/user-scalable\s*=\s*no/.test(viewport) && !/maximum-scale\s*=\s*1(?!\d)/.test(viewport),
  'viewport permits pinch-zoom (WCAG 2.1)',
  `content="${viewport}"`
)

console.log('\n=== iOS Safari (ignores the manifest for install) ===')
check(/apple-mobile-web-app-capable/.test(html), 'apple-mobile-web-app-capable present')
check(/apple-mobile-web-app-status-bar-style/.test(html), 'apple status bar style present')
check(/apple-mobile-web-app-title/.test(html), 'apple-mobile-web-app-title present')
check(/apple-touch-icon/.test(html), 'apple-touch-icon linked')

console.log('\n=== secrets ===')
const bundles = ['sw.js', 'registerSW.js', 'index.html']
let leaked = false
for (const f of bundles) {
  const body = await readFile(join(dist, f), 'utf8')
  if (/SERVICE_ROLE|RESEND_API|VAPID_PRIVATE/.test(body)) leaked = true
}
check(!leaked, 'no server-side secret names in the shipped shell')

console.log()
if (failures > 0) {
  console.log(`❌ ${failures} installability check(s) failed`)
  process.exit(1)
}
console.log('✅ every programmatic installability criterion passes.')
console.log('   Remaining and genuinely manual: tapping Share → Add to Home Screen on a')
console.log('   physical iPhone, and the Android Chrome install prompt. Nothing else blocks them.')
