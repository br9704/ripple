import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { MapComponent } from '@/components/Map'
import { ReportCard } from '@/components/ReportCard'
import { AppHeader } from '@/components/AppHeader'
import { TabBar } from '@/components/TabBar'
import { CameraFab } from '@/components/CameraFab'
import { MapControls } from '@/components/MapControls'
import { useReports } from '@/hooks/useReports'
import type { MapPin } from '@/types'

export function MapPage() {
  const { reports, isLoading } = useReports()
  const [selectedReport, setSelectedReport] = useState<MapPin | null>(null)

  const handlePinClick = useCallback(
    (reportId: string) => {
      const report = reports.find((r) => r.id === reportId)
      if (report) setSelectedReport(report)
    },
    [reports]
  )

  const handleLocateMe = useCallback(() => {
    // Trigger the hidden locate-me button in the Map component
    const btn = document.querySelector('[data-locate-me]') as HTMLButtonElement | null
    btn?.click()
  }, [])

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-bg-primary">
      <AppHeader />

      {/* Map fills the viewport */}
      <div className="absolute inset-0 pt-[52px] pb-14">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-sm text-text-secondary">Loading map...</span>
          </div>
        ) : (
          <MapComponent
            reports={reports}
            onPinClick={handlePinClick}
          />
        )}
      </div>

      {/* Map controls */}
      <MapControls onLocateMe={handleLocateMe} />

      {/* Camera FAB */}
      <CameraFab />

      {/* Tab bar */}
      <TabBar />

      {/* Report detail bottom sheet */}
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
