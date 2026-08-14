// Copies the LiteRT.js WASM runtime out of node_modules into public/.
//
// Why not vendor these into git: they are ~37MB across four variants, and they
// must stay in lockstep with the installed @litertjs/core version. Copying at
// build time makes version drift impossible and keeps the repo lean.
//
// Why not load them from the jsDelivr CDN, which LiteRT's own quickstart
// suggests: that breaks the offline guarantee in PRD §10.5 and CLAUDE.md §4.
// A classifier that only works online is not an on-device classifier.
//
// All four variants are shipped even though only one is fetched at runtime.
// loadLiteRt() feature-detects and picks; a missing variant would be a 404 at
// the worst possible moment rather than a graceful downgrade. They are excluded
// from the service-worker precache and cached on demand instead, so the user
// downloads exactly one (~2MB gzipped).
import { cp, mkdir, readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(scriptDir, '..')
const src = join(root, 'node_modules', '@litertjs', 'core', 'wasm')
const dest = join(root, 'public', 'litert-wasm')

if (!existsSync(src)) {
  console.error(`[litert] WASM source missing: ${src}`)
  console.error('[litert] Install dependencies first (pnpm install).')
  process.exit(1)
}

await mkdir(dest, { recursive: true })
await cp(src, dest, { recursive: true })

const files = await readdir(dest)
let total = 0
for (const f of files) total += (await stat(join(dest, f))).size
console.log(
  `[litert] synced ${files.length} files (${(total / 1024 / 1024).toFixed(1)}MB) → public/litert-wasm/`
)
