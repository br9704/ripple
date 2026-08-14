import { Routes, Route, Link } from 'react-router-dom'
import { OfflineBanner } from '@/components/OfflineBanner'
import { InstallBanner } from '@/components/InstallBanner'
import { OfflineQueueProvider } from '@/components/OfflineQueueProvider'
import { PageTransition } from '@/components/PageTransition'
import { MapPage } from '@/pages/MapPage'
import { ReportFlow } from '@/pages/ReportFlow'

export default function App() {
  return (
    <OfflineQueueProvider>
      <PageTransition />
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/report" element={<ReportFlow />} />
        <Route path="/report/:id" element={<ComingSoon title="Report detail" sprint="Sprint 11" />} />
        <Route path="/feed" element={<ComingSoon title="Feed" sprint="Sprint 10" />} />
        <Route path="/my-reports" element={<ComingSoon title="My Reports" sprint="Sprint 10" />} />
        <Route path="/search" element={<ComingSoon title="Search" sprint="Sprint 12" />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <InstallBanner />
    </OfflineQueueProvider>
  )
}

/**
 * Placeholder for routes whose sprint has not landed yet.
 * SIGNAL forbids dead links — an unbuilt destination says so plainly.
 */
function ComingSoon({ title, sprint }: { title: string; sprint: string }) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg-primary px-6">
      <span className="font-mono text-sm text-text-secondary">{title}</span>
      <span className="font-mono text-xs text-text-tertiary">[coming soon — {sprint}]</span>
      <Link to="/" className="mt-4 font-mono text-xs text-action underline-offset-4 hover:underline">
        [← back to map]
      </Link>
    </div>
  )
}

/**
 * Previously an unknown URL rendered the two banners over an empty page, with
 * no indication anything had gone wrong and no way back.
 */
function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-bg-primary px-6">
      <span className="font-mono text-sm text-text-primary">404</span>
      <span className="font-mono text-xs text-text-secondary">no such page</span>
      <Link to="/" className="mt-4 font-mono text-xs text-action underline-offset-4 hover:underline">
        [← back to map]
      </Link>
    </div>
  )
}
