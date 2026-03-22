import { Routes, Route } from 'react-router-dom'
import { OfflineBanner } from '@/components/OfflineBanner'
import { InstallBanner } from '@/components/InstallBanner'
import { MapPage } from '@/pages/MapPage'
import { ReportFlow } from '@/pages/ReportFlow'

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/report" element={<ReportFlow />} />
        <Route path="/feed" element={<PlaceholderPage title="Feed" />} />
        <Route path="/my-reports" element={<PlaceholderPage title="My Reports" />} />
      </Routes>
      <InstallBanner />
    </>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex h-screen items-center justify-center bg-bg-primary">
      <span className="text-text-secondary text-sm">{title} — coming in Sprint 10</span>
    </div>
  )
}
