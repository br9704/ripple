import { openDB } from 'idb'
import { supabase } from '@/lib/supabase'
import type { CouncilBoundaryWithCouncil } from '@/types'

const DB_NAME = 'ripple-cache'
const DB_VERSION = 1
const STORE_NAME = 'boundaries'
const CACHE_KEY = 'council_boundaries'
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface CacheEntry {
  key: string
  data: CouncilBoundaryWithCouncil[]
  cachedAt: number
}

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    },
  })
}

/**
 * Retrieve cached council boundaries from IndexedDB.
 * Returns null if cache is empty.
 */
export async function getCachedBoundaries(): Promise<CouncilBoundaryWithCouncil[] | null> {
  try {
    const db = await getDB()
    const entry: CacheEntry | undefined = await db.get(STORE_NAME, CACHE_KEY)
    return entry?.data ?? null
  } catch {
    return null
  }
}

/**
 * Check if the cached boundaries are stale (> 7 days old).
 * Returns true if stale or no cache exists.
 */
export async function isCacheStale(): Promise<boolean> {
  try {
    const db = await getDB()
    const entry: CacheEntry | undefined = await db.get(STORE_NAME, CACHE_KEY)
    if (!entry) return true
    return Date.now() - entry.cachedAt > CACHE_MAX_AGE_MS
  } catch {
    return true
  }
}

/**
 * Store council boundaries in IndexedDB cache.
 */
export async function cacheBoundaries(data: CouncilBoundaryWithCouncil[]): Promise<void> {
  try {
    const db = await getDB()
    const entry: CacheEntry = {
      key: CACHE_KEY,
      data,
      cachedAt: Date.now(),
    }
    await db.put(STORE_NAME, entry)
  } catch {
    // Cache write failed — non-critical, boundaries still usable in memory
  }
}

/**
 * Fetch council boundaries from Supabase, joined with council metadata.
 * Caches the result in IndexedDB for offline use.
 * Returns cached data if offline.
 */
export async function fetchAndCacheBoundaries(): Promise<CouncilBoundaryWithCouncil[]> {
  // Try cache first if offline
  if (!navigator.onLine) {
    const cached = await getCachedBoundaries()
    return cached ?? []
  }

  // Check if cache is still fresh
  const stale = await isCacheStale()
  if (!stale) {
    const cached = await getCachedBoundaries()
    if (cached && cached.length > 0) return cached
  }

  // Fetch from Supabase: join council_boundaries with councils
  const { data, error } = await supabase
    .from('council_boundaries')
    .select(`
      id,
      council_id,
      polygon,
      source,
      updated_at,
      councils!inner (
        name,
        slug
      )
    `)
    // Without an explicit order Postgres may return rows in any order, which
    // used to make council attribution non-deterministic in the overlapping
    // seed polygons. detectCouncil() now resolves overlaps by nearest centroid
    // regardless, but a stable order keeps the cached payload byte-identical
    // between refreshes and makes any future bug reproducible.
    .order('council_id', { ascending: true })

  if (error || !data) {
    // Fetch failed — try cache as fallback
    const cached = await getCachedBoundaries()
    return cached ?? []
  }

  // Transform joined data into CouncilBoundaryWithCouncil[]
  const boundaries: CouncilBoundaryWithCouncil[] = data.map((row) => {
    const council = row.councils as unknown as { name: string; slug: string }
    return {
      id: row.id as string,
      council_id: row.council_id as string,
      polygon: row.polygon as Record<string, unknown>,
      source: row.source as string,
      updated_at: row.updated_at as string,
      council_name: council.name,
      council_slug: council.slug,
    }
  })

  // Cache for offline use
  await cacheBoundaries(boundaries)

  return boundaries
}
