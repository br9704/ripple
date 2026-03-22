import { Routes, Route, useNavigate } from 'react-router-dom'
import { OfflineBanner } from '@/components/OfflineBanner'
import { InstallBanner } from '@/components/InstallBanner'
import { ReportFlow } from '@/pages/ReportFlow'

function HomePage() {
  const navigate = useNavigate()

  return (
    <div className="flex h-screen items-center justify-center flex-col gap-4 bg-bg-primary text-text-primary font-body">
      <span className="text-action font-display font-bold text-2xl">
        Ripple
      </span>
      <span className="text-text-secondary text-sm">
        See a problem. Snap it. We'll fix it.
      </span>

      {/* Camera FAB */}
      <button
        type="button"
        onClick={() => navigate('/report')}
        aria-label="Report an issue"
        className="mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-action shadow-glow transition-transform hover:scale-105 active:scale-95"
      >
        <svg className="h-7 w-7 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  )
}

export default function App() {
  return (
    <>
      <OfflineBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/report" element={<ReportFlow />} />
      </Routes>
      <InstallBanner />
    </>
  )
}
