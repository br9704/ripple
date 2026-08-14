import { useState, useCallback, useRef, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MapComponent, type MapHandle } from '@/components/Map'
import { ReportCard } from '@/components/ReportCard'
import { AppHeader } from '@/components/AppHeader'
import { TabBar } from '@/components/TabBar'
import { CameraFab } from '@/components/CameraFab'
import { MapControls } from '@/components/MapControls'
import { useReports } from '@/hooks/useReports'
import { FilterPanel } from '@/components/FilterPanel'
import { MapKeyboardList } from '@/components/MapKeyboardList'
import { useFilterStore } from '@/stores/filterStore'
import { applyFilters, countActiveFilters, countReportsSince } from '@/lib/reportFilters'
import { TypingLine } from '@/components/TypingLine'
import type { MapPin } from '@/types'

export function MapPage() {
  const { reports, isLoading } = useReports()
  const [selectedReport, setSelectedReport] = useState<MapPin | null>(null)
  const [showFilters, setShowFilters] = useState(false)

  const { categories, statuses, dateRange, minUpvotes, showHeatmap, toggleHeatmap } =
    useFilterStore()

  const criteria = useMemo(
    () => ({ categories, statuses, dateRange, minUpvotes }),
    [categories, statuses, dateRange, minUpvotes]
  )

  const visibleReports = useMemo(() => applyFilters(reports, criteria), [reports, criteria])
  const activeFilterCount = countActiveFilters(criteria)

  // "147 reports this week" — the counter pill (PRD §12.2). Counted from the
  // filtered set so the number always matches what is on screen.
  //
  // `now` is captured once per mount rather than read inside the memo: calling
  // Date.now() during render is impure, and the boundary does not need to be
  // accurate to the millisecond for a "this week" count.
  const [mountedAt] = useState(() => Date.now())
  const reportsThisWeek = useMemo(
    () => countReportsSince(visibleReports, mountedAt - 7 * 24 * 60 * 60 * 1000),
    [visibleReports, mountedAt]
  )

  const handlePinClick = useCallback(
    (reportId: string) => {
      const report = reports.find((r) => r.id === reportId)
      if (report) setSelectedReport(report)
    },
    [reports]
  )

  const mapRef = useRef<MapHandle>(null)

  const handleLocateMe = useCallback(() => {
    mapRef.current?.flyToUser()
  }, [])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <AppHeader />

      {/* Map fills the viewport */}
      <div className="absolute inset-0 pt-[52px] pb-14">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <TypingLine text="loading map..." />
          </div>
        ) : (
          <MapComponent
            ref={mapRef}
            reports={visibleReports}
            onPinClick={handlePinClick}
            showHeatmap={showHeatmap}
          />
        )}
      </div>

      {/* Canvas pins are invisible to assistive tech — this is the
          keyboard/screen-reader equivalent (PRD §10.2). */}
      <MapKeyboardList reports={visibleReports} onSelect={handlePinClick} />

      {/* Map controls */}
      <MapControls
        onLocateMe={handleLocateMe}
        onToggleHeatmap={toggleHeatmap}
        onToggleFilters={() => setShowFilters(true)}
        heatmapActive={showHeatmap}
        activeFilterCount={activeFilterCount}
      />

      {/* Reports counter pill (PRD §12.2) */}
      {!isLoading && (
        <div className="pointer-events-none absolute bottom-[72px] left-4 z-30 border border-border bg-bg-primary/90 px-2 py-1">
          <span className="font-mono text-xs tabular-nums text-text-secondary">
            {reportsThisWeek} {reportsThisWeek === 1 ? 'report' : 'reports'} this week
          </span>
        </div>
      )}

      {/* Camera FAB */}
      <CameraFab />

      {/* Tab bar */}
      <TabBar />

      {/* Report detail bottom sheet */}
      <AnimatePresence>
        {showFilters && <FilterPanel onClose={() => setShowFilters(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {selectedReport && (
          <ReportCard
            report={selectedReport}
            onClose={() => setSelectedReport(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
