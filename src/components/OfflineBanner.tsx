import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-bg-elevated px-4 py-3 text-sm text-text-secondary border-b border-border safe-top"
    >
      <span aria-hidden="true" className="font-mono">!</span>
      <span>You're offline — reports will submit when reconnected</span>
    </div>
  )
}
