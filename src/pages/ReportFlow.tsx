import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraCapture } from '@/components/CameraCapture'
import { PhotoPreview } from '@/components/PhotoPreview'
import { CategoryPicker } from '@/components/CategoryPicker'
import { NoteInput } from '@/components/NoteInput'
import { LocationStatus } from '@/components/LocationStatus'
import { SubmissionSuccess } from '@/components/SubmissionSuccess'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useReporterToken } from '@/hooks/useReporterToken'
import { useSubmitReport } from '@/hooks/useSubmitReport'
import { useOfflineQueue } from '@/hooks/useOfflineQueue'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { reverseGeocode } from '@/lib/reverseGeocode'
import { detectCouncil } from '@/lib/councilDetection'
import { fetchAndCacheBoundaries } from '@/lib/boundaryCache'
import { blobToBase64 } from '@/lib/blobToBase64'
import type { ReportCategory, CouncilBoundaryWithCouncil } from '@/types'

type FlowStep = 'camera' | 'review' | 'success' | 'queued'

export function ReportFlow() {
  const navigate = useNavigate()
  const reporterToken = useReporterToken()
  const geo = useGeolocation()
  const { submit, isSubmitting, error: submitError } = useSubmitReport()
  const { queueReport } = useOfflineQueue()
  const isOnline = useOnlineStatus()

  const [step, setStep] = useState<FlowStep>('camera')
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null)
  const [note, setNote] = useState('')

  // Location enrichment
  const [address, setAddress] = useState<string | null>(null)
  const [suburb, setSuburb] = useState<string | null>(null)
  const [postcode, setPostcode] = useState<string | null>(null)
  const [boundaries, setBoundaries] = useState<CouncilBoundaryWithCouncil[]>([])

  // Submitted report details (for success screen)
  const [submittedAddress, setSubmittedAddress] = useState<string | null>(null)
  const [submittedCategory, setSubmittedCategory] = useState<ReportCategory>('other')
  const [submittedCouncil, setSubmittedCouncil] = useState<string | null>(null)

  // Council detection — derived from coordinates + boundaries (pure, no side effects)
  const detectedCouncil = useMemo(() => {
    if (geo.lat === null || geo.lng === null || boundaries.length === 0) return null
    return detectCouncil(geo.lat, geo.lng, boundaries)
  }, [geo.lat, geo.lng, boundaries])

  const councilId = detectedCouncil?.council_id ?? null
  const councilName = detectedCouncil?.council_name ?? null

  // Fetch council boundaries on mount
  useEffect(() => {
    fetchAndCacheBoundaries().then(setBoundaries)
  }, [])

  // Reverse geocode when GPS resolves (async — must be in effect)
  useEffect(() => {
    if (geo.lat === null || geo.lng === null) return
    let cancelled = false

    reverseGeocode(geo.lat, geo.lng).then((result) => {
      if (cancelled || !result) return
      setAddress(result.address)
      setSuburb(result.suburb)
      setPostcode(result.postcode)
    })

    return () => { cancelled = true }
  }, [geo.lat, geo.lng])

  const handlePhotoCaptured = useCallback((capturedPhoto: Blob, capturedPreview: string) => {
    setPhoto(capturedPhoto)
    setPreview(capturedPreview)
    setStep('review')
  }, [])

  const handleRetake = useCallback(() => {
    setPhoto(null)
    setPreview(null)
    setSelectedCategory(null)
    setNote('')
    setStep('camera')
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!photo || !selectedCategory) return
    if (geo.lat === null || geo.lng === null) return

    const reportData = {
      photo,
      category: selectedCategory,
      lat: geo.lat,
      lng: geo.lng,
      address,
      suburb,
      postcode,
      council_id: councilId,
      note,
      reporter_token: reporterToken,
    }

    // Store for success screen
    setSubmittedAddress(address)
    setSubmittedCategory(selectedCategory)
    setSubmittedCouncil(councilName)

    if (!isOnline) {
      // Queue for later submission
      const photoBase64 = await blobToBase64(photo)
      await queueReport({
        category: selectedCategory,
        lat: geo.lat,
        lng: geo.lng,
        address,
        suburb,
        postcode,
        council_id: councilId,
        note,
        reporter_token: reporterToken,
        photo_base64: photoBase64,
      })
      setStep('queued')
      return
    }

    const result = await submit(reportData)
    if (result) {
      setSubmittedAddress(result.address ?? address)
      setSubmittedCouncil(result.council_name ?? councilName)
      setStep('success')
    }
  }, [photo, selectedCategory, geo.lat, geo.lng, address, suburb, postcode, councilId, councilName, note, reporterToken, isOnline, submit, queueReport])

  const handleReportAnother = useCallback(() => {
    setPhoto(null)
    setPreview(null)
    setSelectedCategory(null)
    setNote('')
    setAddress(null)
    setSuburb(null)
    setPostcode(null)
    setStep('camera')
  }, [])

  const canSubmit = !!photo && !!selectedCategory && geo.lat !== null && geo.lng !== null && !isSubmitting

  // Camera step
  if (step === 'camera') {
    return (
      <CameraCapture
        onClose={() => navigate('/')}
        onPhotoCaptured={handlePhotoCaptured}
      />
    )
  }

  // Success / Queued step
  if (step === 'success' || step === 'queued') {
    return (
      <div className="h-screen bg-bg-primary">
        <SubmissionSuccess
          address={submittedAddress}
          category={submittedCategory}
          councilName={submittedCouncil}
          onReportAnother={handleReportAnother}
          queued={step === 'queued'}
        />
      </div>
    )
  }

  // Review step
  return (
    <div className="flex h-screen flex-col bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button
          type="button"
          onClick={handleRetake}
          className="text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Go back"
        >
          ← Back
        </button>
        <h1 className="text-sm font-semibold text-text-primary">What did you see?</h1>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Photo preview */}
        {preview && (
          <PhotoPreview previewUrl={preview} onRetake={handleRetake} />
        )}

        {/* Location status */}
        <LocationStatus
          lat={geo.lat}
          lng={geo.lng}
          isLocating={geo.isLocating}
          timedOut={geo.timedOut}
          address={address}
          councilName={councilName}
          error={geo.error}
        />

        {/* Category selection */}
        <div>
          <h2 className="mb-2 text-sm font-medium text-text-secondary">Select category</h2>
          <CategoryPicker selected={selectedCategory} onSelect={setSelectedCategory} />
        </div>

        {/* Note input */}
        <div>
          <h2 className="mb-2 text-sm font-medium text-text-secondary">Add a note (optional)</h2>
          <NoteInput value={note} onChange={setNote} />
        </div>

        {/* Submit error */}
        {submitError && (
          <div className="rounded-lg bg-status-declined/10 px-4 py-3 text-sm text-status-declined">
            {submitError}
          </div>
        )}
      </div>

      {/* Submit button — fixed at bottom */}
      <div className="border-t border-border px-4 py-4">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full rounded-lg px-4 py-3.5 text-sm font-semibold transition-colors ${
            canSubmit
              ? 'bg-action text-text-primary hover:bg-action-hover active:bg-action-hover'
              : 'bg-bg-elevated text-text-tertiary cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Submitting...' : !isOnline ? 'Queue Report (Offline)' : 'Submit Report'}
        </button>
      </div>
    </div>
  )
}
