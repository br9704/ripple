import { useState, useEffect, useCallback, useRef } from 'react'
import { openDB } from 'idb'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { supabase } from '@/lib/supabase'
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
}

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
      }
    },
  })
}

export function useOfflineQueue() {
  const [queueLength, setQueueLength] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const isOnline = useOnlineStatus()
  const processingRef = useRef(false)

  // Count pending reports
  const refreshCount = useCallback(async () => {
    try {
      const db = await getDB()
      const count = await db.count(STORE_NAME)
      setQueueLength(count)
    } catch {
      // IndexedDB unavailable
    }
  }, [])

  // Queue a report for later submission
  const queueReport = useCallback(async (data: Omit<QueuedReport, 'id' | 'queuedAt'>) => {
    try {
      const db = await getDB()
      await db.add(STORE_NAME, { ...data, queuedAt: Date.now() })
      await refreshCount()
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to queue report')
    }
  }, [refreshCount])

  // Process all queued reports
  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true
    setIsProcessing(true)

    try {
      const db = await getDB()
      const all = await db.getAll(STORE_NAME)

      for (const report of all) {
        try {
          const { error } = await supabase.functions.invoke('submit-report', {
            body: {
              category: report.category,
              ai_category: report.category,
              ai_confidence: 0,
              user_corrected_ai: false,
              lat: report.lat,
              lng: report.lng,
              address: report.address,
              suburb: report.suburb,
              postcode: report.postcode,
              council_id: report.council_id,
              note: report.note || undefined,
              reporter_token: report.reporter_token,
              photo_base64: report.photo_base64,
            },
          })

          if (!error) {
            await db.delete(STORE_NAME, report.id)
          }
          // If error, leave in queue for next retry
        } catch {
          // Network error — stop processing, will retry on next reconnect
          break
        }
      }

      await refreshCount()
    } finally {
      processingRef.current = false
      setIsProcessing(false)
    }
  }, [refreshCount])

  // Process queue when coming back online
  useEffect(() => {
    if (isOnline && queueLength > 0) {
      processQueue()
    }
  }, [isOnline, queueLength, processQueue])

  // Initial count on mount
  useEffect(() => {
    refreshCount()
  }, [refreshCount])

  return { queueReport, queueLength, isProcessing }
}
