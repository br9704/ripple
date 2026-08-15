import { Routes, Route, Link } from 'react-router-dom'
import { OfflineBanner } from '@/components/OfflineBanner'
import { InstallBanner } from '@/components/InstallBanner'
import { OfflineQueueProvider } from '@/components/OfflineQueueProvider'
import { PageTransition } from '@/components/PageTransition'
import { MapPage } from '@/pages/MapPage'
import { ReportFlow } from '@/pages/ReportFlow'
import { FeedPage } from '@/pages/FeedPage'
import { MyReportsPage } from '@/pages/MyReportsPage'
import { ReportDetailPage } from '@/pages/ReportDetailPage'
import { SearchPage } from '@/pages/SearchPage'
import { CouncilDashboard } from '@/pages/CouncilDashboard'
import { TermsPage } from '@/pages/TermsPage'
import { useArrivalReferral } from '@/hooks/useReferral'

export default function App() {
  // S21.5. Mounted here rather than on a page because an invite link can land
  // anywhere — `/` for a plain invite, but also a report permalink or one of
  // Sprint 20's shareable filtered map views, all of which can carry `?ref=`.
  // Redemption is a side effect, so the return value is deliberately unused;
  // the hook strips the parameter from the URL before it issues the request,
  // so a reload or a bookmark cannot replay it.
  useArrivalReferral()

  return (
    <OfflineQueueProvider>
      <PageTransition />
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/report" element={<ReportFlow />} />
        <Route path="/report/:id" element={<ReportDetailPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/my-reports" element={<MyReportsPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/council" element={<CouncilDashboard />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <InstallBanner />
    </OfflineQueueProvider>
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
