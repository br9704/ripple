import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { CameraCapture } from '@/components/CameraCapture'
import { PhotoPreview } from '@/components/PhotoPreview'
import { CategoryPicker } from '@/components/CategoryPicker'
import { NoteInput } from '@/components/NoteInput'
import { NotifyOptIn } from '@/components/NotifyOptIn'
import { LocationStatus } from '@/components/LocationStatus'
// Also lazy: LocationPicker imports Mapbox, and most reports never open it.
const LocationPicker = lazy(() =>
  import('@/components/LocationPicker').then((m) => ({ default: m.LocationPicker }))
)
import { AIResultCard } from '@/components/AIResultCard'
import { ScanOverlay } from '@/components/ScanOverlay'
import { useAIClassification } from '@/hooks/useAIClassification'
import { SubmissionSuccess } from '@/components/SubmissionSuccess'
import type { DuplicateNearby } from '@/components/DuplicateAlert'
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
  const [notifyEmail, setNotifyEmail] = useState('')
  const [isPickingLocation, setIsPickingLocation] = useState(false)

  // Location enrichment
  const [address, setAddress] = useState<string | null>(null)
  const [suburb, setSuburb] = useState<string | null>(null)
  const [postcode, setPostcode] = useState<string | null>(null)
  const [boundaries, setBoundaries] = useState<CouncilBoundaryWithCouncil[]>([])

  // Submitted report details (for success screen)
  const [submittedAddress, setSubmittedAddress] = useState<string | null>(null)
  const [submittedCategory, setSubmittedCategory] = useState<ReportCategory>('other')
  const [submittedCouncil, setSubmittedCouncil] = useState<string | null>(null)
  const [duplicateNearby, setDuplicateNearby] = useState<DuplicateNearby | null>(null)
  const [showPicker, setShowPicker] = useState(false)

  // On-device classification. Runs as soon as a photo exists; never blocks the
  // report — see the graceful-degradation contract in useAIClassification.
  const ai = useAIClassification(photo)

  // Council detection — derived from coordinates + boundaries (pure, no side effects)
  const detectedCouncil = useMemo(() => {
    if (geo.lat === null || geo.lng === null || boundaries.length === 0) return null
    return detectCouncil(geo.lat, geo.lng, boundaries)
  }, [geo.lat, geo.lng, boundaries])

  const councilId = detectedCouncil?.council_id ?? null
  const councilName = detectedCouncil?.council_name ?? null

  // The AI proposes; the user disposes. An explicit choice always wins.
  const effectiveCategory = selectedCategory ?? ai.category
  const userCorrectedAI =
    ai.category !== null && selectedCategory !== null && selectedCategory !== ai.category


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
    if (!photo || !effectiveCategory) return
    if (geo.lat === null || geo.lng === null) return

    const reportData = {
      photo,
      category: effectiveCategory,
      ai_category: ai.category,
      ai_confidence: ai.confidence,
      user_corrected_ai: userCorrectedAI,
      lat: geo.lat,
      lng: geo.lng,
      address,
      suburb,
      postcode,
      council_id: councilId,
      note,
      notify_email: notifyEmail.trim() || undefined,
      reporter_token: reporterToken,
    }

    // Store for success screen
    setSubmittedAddress(address)
    setSubmittedCategory(effectiveCategory)
    setSubmittedCouncil(councilName)

    if (!isOnline) {
      // Queue for later submission
      const photoBase64 = await blobToBase64(photo)
      await queueReport({
        category: effectiveCategory,
        ai_category: ai.category,
        ai_confidence: ai.confidence,
        user_corrected_ai: userCorrectedAI,
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
      // The server has always returned this; the client used to discard it.
      setDuplicateNearby(result.duplicate_nearby ?? null)
      setStep('success')
    }
  }, [photo, effectiveCategory, ai.category, ai.confidence, userCorrectedAI, geo.lat, geo.lng, address, suburb, postcode, councilId, councilName, note, notifyEmail, reporterToken, isOnline, submit, queueReport])

  const handleReportAnother = useCallback(() => {
    setPhoto(null)
    setPreview(null)
    setSelectedCategory(null)
    setNote('')
    setAddress(null)
    setSuburb(null)
    setPostcode(null)
    setDuplicateNearby(null)
    setStep('camera')
  }, [])

  const handlePickLocation = useCallback(
    (lat: number, lng: number) => {
      geo.setManualPosition(lat, lng)
      setIsPickingLocation(false)
    },
    [geo]
  )

  const canSubmit = !!photo && !!effectiveCategory && geo.lat !== null && geo.lng !== null && !isSubmitting

  // GPS has no fix and has stopped trying — the user needs a way through.
  const needsManualLocation = !geo.isLocating && geo.lat === null

  // Camera step
  if (step === 'camera') {
    return (
      <CameraCapture
        onClose={() => navigate('/')}
        onPhotoCaptured={handlePhotoCaptured}
      />
    )
  }

  if (isPickingLocation) {
    return (
      <Suspense fallback={<div className="h-screen bg-bg-primary" />}>
        <LocationPicker
          initialLat={geo.lat}
          initialLng={geo.lng}
          onConfirm={handlePickLocation}
          onCancel={() => setIsPickingLocation(false)}
        />
      </Suspense>
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
          duplicate={duplicateNearby}
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

        {/* GPS gave up. Without this the submit button stays disabled forever
            with nothing on screen to explain why. */}
        {needsManualLocation && (
          <div className="border border-border px-4 py-3">
            <p className="font-mono text-xs text-text-secondary">
              &gt; {geo.error ? 'location unavailable' : 'could not get a GPS fix'}
            </p>
            <button
              type="button"
              onClick={() => setIsPickingLocation(true)}
              className="mt-2 font-mono text-xs text-action underline-offset-4 hover:underline"
            >
              [ set the location manually → ]
            </button>
          </div>
        )}

        {/* Always available, even on a good fix — urban-canyon GPS is often
            tens of metres out, and PRD §15 calls for manual adjustment. */}
        {!needsManualLocation && geo.lat !== null && (
          <button
            type="button"
            onClick={() => setIsPickingLocation(true)}
            className="font-mono text-xs text-text-secondary underline-offset-4 transition-colors hover:text-text-primary hover:underline"
          >
            [ adjust location ]
          </button>
        )}

        {/* ── Classification ──
            While the model runs, the scan sequence occupies this space. When it
            settles, the result card takes over. If classification is
            unavailable for any reason, we fall straight through to the manual
            picker — a broken classifier must never block a report (S7.11). */}
        {preview && (ai.isClassifying || ai.isModelLoading) && (
          <ScanOverlay
            previewUrl={preview}
            isModelLoading={ai.isModelLoading}
            loadProgress={ai.loadProgress}
          />
        )}

        {!ai.isClassifying && !ai.isModelLoading && ai.tier && ai.top2.length > 0 && (
          <AIResultCard
            top2={ai.top2}
            tier={ai.tier}
            selected={effectiveCategory}
            onSelect={setSelectedCategory}
            onOpenPicker={() => setShowPicker(true)}
          />
        )}

        {ai.error && !ai.isClassifying && (
          <p className="font-mono text-xs text-text-tertiary">
            &gt; classifier unavailable — pick a category
          </p>
        )}

        {/* Manual picker: always reachable, and shown by default whenever the
            AI has not produced a usable answer. PRD §6.2 requires the category
            selector to be available at any confidence level. */}
        {(showPicker || ai.error || (!ai.tier && !ai.isClassifying && !ai.isModelLoading)) && (
          <div>
            <h2 className="mb-2 font-mono text-xs text-text-secondary">select category</h2>
            <CategoryPicker
              selected={effectiveCategory}
              onSelect={(c) => {
                setSelectedCategory(c)
                setShowPicker(false)
              }}
            />
          </div>
        )}

        {/* Note input */}
        <div>
          <h2 className="mb-2 font-mono text-xs text-text-secondary">add a note (optional)</h2>
          <NoteInput value={note} onChange={setNote} />
        </div>

        {/* Status notifications — strictly opt-in (PRD §13.1) */}
        <NotifyOptIn value={notifyEmail} onChange={setNotifyEmail} />

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
              ? 'bg-action text-bg-primary hover:bg-action-hover active:bg-action-hover'
              : 'bg-bg-elevated text-text-tertiary cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Submitting...' : !isOnline ? 'Queue Report (Offline)' : 'Submit Report'}
        </button>
      </div>
    </div>
  )
}
