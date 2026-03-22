interface MapControlsProps {
  onLocateMe: () => void
}

export function MapControls({ onLocateMe }: MapControlsProps) {
  return (
    <div className="fixed right-3 bottom-36 z-30 flex flex-col gap-2">
      {/* Heatmap toggle — placeholder until Sprint 9 */}
      <button
        type="button"
        aria-label="Toggle heatmap"
        className="flex h-11 w-11 items-center justify-center rounded-md bg-bg-elevated shadow-card text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
        </svg>
      </button>

      {/* Filter toggle — placeholder until Sprint 9 */}
      <button
        type="button"
        aria-label="Filter reports"
        className="flex h-11 w-11 items-center justify-center rounded-md bg-bg-elevated shadow-card text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
        </svg>
      </button>

      {/* Locate me */}
      <button
        type="button"
        onClick={onLocateMe}
        aria-label="Centre on my location"
        className="flex h-11 w-11 items-center justify-center rounded-md bg-bg-elevated shadow-card text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 0v4m0-4h4m-4 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>
    </div>
  )
}
