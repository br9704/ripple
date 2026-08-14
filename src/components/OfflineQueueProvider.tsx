import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { supabase } from '@/lib/supabase'
import { OfflineQueueContext } from '@/lib/offlineQueueContext'
import {
  addToQueue,
  countQueued,
  getAllQueued,
  removeFromQueue,
  queuedReportToPayload,
  type QueuedReportInput,
} from '@/lib/offlineQueue'

/**
 * Owns the pending-report queue for the whole app.
 *
 * This used to be a plain hook mounted only by ReportFlow, which meant a user
 * who queued a report offline and then reconnected while sitting on the map
 * never had it submitted — they had to navigate back to /report to flush their
 * own queue. Mounting it once at the root makes reconnect-anywhere work, which
 * is what OfflineBanner already promises the user.
 */
export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const [queueLength, setQueueLength] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)
  const isOnline = useOnlineStatus()
  const processingRef = useRef(false)

  const refreshCount = useCallback(async () => {
    try {
      setQueueLength(await countQueued())
    } catch {
      // IndexedDB unavailable (private browsing, quota) — treat as empty.
    }
  }, [])

  const queueReport = useCallback(
    async (data: QueuedReportInput) => {
      try {
        await addToQueue(data)
        await refreshCount()
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to queue report')
      }
    },
    [refreshCount]
  )

  const processQueue = useCallback(async () => {
    if (processingRef.current) return
    processingRef.current = true
    setIsProcessing(true)

    try {
      const all = await getAllQueued()

      for (const report of all) {
        try {
          const { error } = await supabase.functions.invoke('submit-report', {
            body: queuedReportToPayload(report),
          })

          if (!error) {
            await removeFromQueue(report.id)
          }
          // A non-network error (validation) leaves the item queued for retry.
        } catch {
          // Network failure — stop; the next reconnect resumes from here.
          break
        }
      }

      await refreshCount()
    } catch {
      // Queue unreadable — leave state as-is rather than dropping reports.
    } finally {
      processingRef.current = false
      setIsProcessing(false)
    }
  }, [refreshCount])

  useEffect(() => {
    if (isOnline && queueLength > 0) {
      void processQueue()
    }
  }, [isOnline, queueLength, processQueue])

  useEffect(() => {
    void refreshCount()
  }, [refreshCount])

  return (
    <OfflineQueueContext.Provider value={{ queueReport, processQueue, queueLength, isProcessing }}>
      {children}
    </OfflineQueueContext.Provider>
  )
}
