interface LocationStatusProps {
  lat: number | null
  lng: number | null
  isLocating: boolean
  timedOut: boolean
  address: string | null
  councilName: string | null
  error: string | null
}

export function LocationStatus({
  lat,
  lng,
  isLocating,
  timedOut,
  address,
  councilName,
  error,
}: LocationStatusProps) {
  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-status-declined/10 px-3 py-2.5 text-sm">
        <span aria-hidden="true" className="font-mono">&gt;</span>
        <div>
          <p className="text-status-declined">{error}</p>
          <p className="mt-1 text-xs text-text-tertiary">
            You can still submit — coordinates will be added when available.
          </p>
        </div>
      </div>
    )
  }

  if (isLocating) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-bg-elevated px-3 py-2.5 text-sm text-text-secondary">
        <span className="font-mono status-pulse" aria-hidden="true">&gt;</span>
        <span>
          Getting location...
          {timedOut && (
            <span className="text-text-tertiary"> (taking longer than expected)</span>
          )}
        </span>
      </div>
    )
  }

  if (lat !== null && lng !== null) {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-bg-elevated px-3 py-2.5 text-sm">
        <span aria-hidden="true" className="font-mono">&gt;</span>
        <div className="min-w-0">
          <p className="truncate text-text-primary">
            {address ?? `${lat.toFixed(4)}, ${lng.toFixed(4)}`}
          </p>
          {councilName && (
            <p className="text-xs text-text-secondary">{councilName}</p>
          )}
        </div>
      </div>
    )
  }

  return null
}
