import { openDB, type IDBPDatabase } from 'idb'
import type { ReportCategory } from '@/types'

const DB_NAME = 'ripple-queue'
const DB_VERSION = 1
const STORE_NAME = 'pending-reports'

export interface QueuedReport {
  id: number
  category: ReportCategory
  lat: number
  lng: number
  address: string | null
  suburb: string | null
  postcode: string | null
  council_id: string | null
  note: string
  reporter_token: string
  photo_base64: string
  queuedAt: number
  /** What the on-device model predicted, if it ran before the report queued. */
  ai_category?: ReportCategory | null
  ai_confidence?: number
  user_corrected_ai?: boolean
}

export type QueuedReportInput = Omit<QueuedReport, 'id' | 'queuedAt'>

export async function getQueueDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    },
  })
}

export async function countQueued(): Promise<number> {
  const db = await getQueueDB()
  return db.count(STORE_NAME)
}

export async function addToQueue(data: QueuedReportInput): Promise<void> {
  const db = await getQueueDB()
  await db.add(STORE_NAME, { ...data, queuedAt: Date.now() })
}

export async function getAllQueued(): Promise<QueuedReport[]> {
  const db = await getQueueDB()
  return db.getAll(STORE_NAME) as Promise<QueuedReport[]>
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await getQueueDB()
  await db.delete(STORE_NAME, id)
}

/**
 * Builds the submit-report payload for a queued report.
 *
 * Kept separate from the network call so the shape stays testable, and so the
 * queued path and the live path cannot drift apart silently.
 */
export function queuedReportToPayload(report: QueuedReport) {
  return {
    category: report.category,
    // Omitted rather than defaulted to `category`. Writing the final category
    // in as the "prediction" would fabricate a model output that never
    // happened, and this field feeds the S7.9 correction log — which is a
    // training dataset, so a phantom row there is worse than a missing one.
    ai_category: report.ai_category ?? undefined,
    ai_confidence: report.ai_confidence ?? 0,
    user_corrected_ai: report.user_corrected_ai ?? false,
    lat: report.lat,
    lng: report.lng,
    address: report.address,
    suburb: report.suburb,
    postcode: report.postcode,
    council_id: report.council_id,
    note: report.note || undefined,
    reporter_token: report.reporter_token,
    photo_base64: report.photo_base64,
  }
}

export const QUEUE_STORE_NAME = STORE_NAME
