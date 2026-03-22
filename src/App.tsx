import { useState, useCallback } from 'react'
import { OfflineBanner } from '@/components/OfflineBanner'
import { InstallBanner } from '@/components/InstallBanner'
import { CameraCapture } from '@/components/CameraCapture'

export default function App() {
  const [showCamera, setShowCamera] = useState(false)
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)

  const handlePhotoCaptured = useCallback((_photo: Blob, preview: string) => {
    setCapturedPreview(preview)
    setShowCamera(false)
  }, [])

  return (
    <>
      <OfflineBanner />
      <div className="flex h-screen items-center justify-center flex-col gap-4 bg-bg-primary text-text-primary font-body">
        <span className="text-action font-display font-bold text-2xl">
          Ripple
        </span>
        <span className="text-text-secondary text-sm">
          See a problem. Snap it. We'll fix it.
        </span>

        {capturedPreview && (
          <img
            src={capturedPreview}
            alt="Captured"
            className="mt-4 max-h-[200px] rounded-lg border border-border"
          />
        )}

        {/* Camera FAB */}
        <button
          type="button"
          onClick={() => setShowCamera(true)}
          aria-label="Report an issue"
          className="mt-6 flex h-16 w-16 items-center justify-center rounded-full bg-action shadow-glow transition-transform hover:scale-105 active:scale-95"
        >
          <svg className="h-7 w-7 text-text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {showCamera && (
        <CameraCapture
          onClose={() => setShowCamera(false)}
          onPhotoCaptured={handlePhotoCaptured}
        />
      )}

      <InstallBanner />
    </>
  )
}
