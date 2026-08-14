import { useContext } from 'react'
import { OfflineQueueContext, type OfflineQueueValue } from '@/lib/offlineQueueContext'

export type { QueuedReport, QueuedReportInput } from '@/lib/offlineQueue'

/**
 * Access to the app-level pending-report queue.
 * Must be called beneath <OfflineQueueProvider /> (mounted in App.tsx).
 */
export function useOfflineQueue(): OfflineQueueValue {
  const ctx = useContext(OfflineQueueContext)
  if (!ctx) {
    throw new Error('useOfflineQueue must be used within an OfflineQueueProvider')
  }
  return ctx
}
