import { createContext } from 'react'
import type { QueuedReportInput } from '@/lib/offlineQueue'

export interface OfflineQueueValue {
  queueReport: (data: QueuedReportInput) => Promise<void>
  processQueue: () => Promise<void>
  queueLength: number
  isProcessing: boolean
}

/**
 * Lives apart from both the provider component and the consumer hook so that
 * neither file mixes component and non-component exports — react-refresh needs
 * that separation to hot-reload correctly.
 */
export const OfflineQueueContext = createContext<OfflineQueueValue | null>(null)
