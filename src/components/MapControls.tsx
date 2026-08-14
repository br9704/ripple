interface MapControlsProps {
  onLocateMe: () => void
  onToggleHeatmap: () => void
  onToggleFilters: () => void
  heatmapActive: boolean
  activeFilterCount: number
}

export function MapControls({
  onLocateMe,
  onToggleHeatmap,
  onToggleFilters,
  heatmapActive,
  activeFilterCount,
}: MapControlsProps) {
  return (
    <div className="fixed right-3 bottom-36 z-30 flex flex-col gap-2">
      {/* Heatmap toggle — wired in Sprint 9. Until then this button had no
          onClick at all: it looked enabled and did nothing. */}
      <button
        type="button"
        onClick={onToggleHeatmap}
        aria-label="Toggle heatmap"
        aria-pressed={heatmapActive}
        className={`flex h-11 w-11 items-center justify-center border bg-bg-secondary transition-colors ${
          heatmapActive
            ? 'border-action text-action'
            : 'border-border-bright text-text-secondary hover:text-text-primary'
        }`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      </button>

      {/* Filter toggle — wired in Sprint 9, with the active-count badge
          PRD §12.2 specifies. */}
      <button
        type="button"
        onClick={onToggleFilters}
        aria-label={
          activeFilterCount > 0
            ? `Filter reports (${activeFilterCount} active)`
            : 'Filter reports'
        }
        className={`relative flex h-11 w-11 items-center justify-center border bg-bg-secondary transition-colors ${
          activeFilterCount > 0
            ? 'border-action text-action'
            : 'border-border-bright text-text-secondary hover:text-text-primary'
        }`}
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
        {activeFilterCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center border border-action bg-bg-primary px-1 font-mono text-[10px] tabular-nums text-action"
          >
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Locate me */}
      <button
        type="button"
        onClick={onLocateMe}
        aria-label="Centre on my location"
        className="flex h-11 w-11 items-center justify-center border border-border-bright bg-bg-secondary text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 0v4m0-4h4m-4 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  )
}
