import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { blobToBase64 } from '@/lib/blobToBase64'
import { AI_MODEL_VERSION, MAX_REPORTS_PER_HOUR } from '@/constants/config'
import type { ReportCategory, SubmitReportResponse } from '@/types'

const RATE_LIMIT_KEY = 'ripple_report_timestamps'

export interface ReportSubmitData {
  photo: Blob
  category: ReportCategory
  /** What the on-device model predicted, if it ran at all. */
  ai_category?: ReportCategory | null
  ai_confidence?: number
  /** True when the user picked something other than the AI's answer. */
  user_corrected_ai?: boolean
  lat: number
  lng: number
  address: string | null
  suburb: string | null
  postcode: string | null
  council_id: string | null
  note: string
  /** Opt-in only — absent unless the user typed one (PRD §13.1). */
  notify_email?: string
  reporter_token: string
}

function isRateLimited(): boolean {
  const raw = localStorage.getItem(RATE_LIMIT_KEY)
  if (!raw) return false

  const timestamps: number[] = JSON.parse(raw)
  const oneHourAgo = Date.now() - 3600000
  const recent = timestamps.filter((t) => t > oneHourAgo)

  // Clean up old timestamps
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent))

  return recent.length >= MAX_REPORTS_PER_HOUR
}

/**
 * Recovers the real error message from a failed Edge Function call.
 *
 * supabase-js v2 does not parse non-2xx response bodies: `FunctionsHttpError`
 * carries the literal string "Edge Function returned a non-2xx status code",
 * regardless of what the function actually said. The real body hangs off
 * `context`, which is the undrained `Response`. Without this, every precise
 * validation message the Edge Function produces ("Note exceeds 140 character
 * limit", "Coordinates out of valid range", …) is invisible to the user.
 */
export async function extractFunctionError(fnError: unknown): Promise<string> {
  const FALLBACK = 'Report submission failed. Please try again.'

  const context = (fnError as { context?: unknown })?.context
  if (context instanceof Response) {
    try {
      const body = await context.clone().json()
      const message =
        typeof body === 'object' && body !== null
          ? ((body as Record<string, unknown>).error ?? (body as Record<string, unknown>).message)
          : null
      if (typeof message === 'string' && message.trim()) return message
    } catch {
      // Body was not JSON, or was already consumed — fall through.
    }
  }

  const raw = (fnError as { message?: unknown })?.message
  if (typeof raw === 'string' && raw.trim() && !raw.includes('non-2xx status code')) {
    return raw
  }

  return FALLBACK
}

function recordSubmission(): void {
  const raw = localStorage.getItem(RATE_LIMIT_KEY)
  const timestamps: number[] = raw ? JSON.parse(raw) : []
  timestamps.push(Date.now())
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(timestamps))
}

export function useSubmitReport() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(async (data: ReportSubmitData): Promise<SubmitReportResponse | null> => {
    setError(null)

    if (isRateLimited()) {
      setError(`Too many reports. Please wait before submitting another (max ${MAX_REPORTS_PER_HOUR}/hour).`)
      return null
    }

    setIsSubmitting(true)

    try {
      const photoBase64 = await blobToBase64(data.photo)

      const payload = {
        category: data.category,
        // Null when the classifier did not run (offline first use, load
        // failure, unsupported device). The Edge Function defaults it to the
        // final category, so the correction log never records a phantom
        // prediction the model did not actually make.
        ai_category: data.ai_category ?? undefined,
        ai_confidence: data.ai_confidence ?? 0,
        user_corrected_ai: data.user_corrected_ai ?? false,
        // Sent only when there was a prediction to attribute. Corrections
        // against different model versions must never be pooled (S21.1), and
        // a version stamp on a report the classifier never ran for would
        // claim provenance that does not exist.
        ai_model_version: data.ai_category ? AI_MODEL_VERSION : undefined,
        lat: data.lat,
        lng: data.lng,
        address: data.address,
        suburb: data.suburb,
        postcode: data.postcode,
        council_id: data.council_id,
        note: (data.note ?? '') || undefined,
        notify_email: data.notify_email ?? undefined,
        reporter_token: data.reporter_token,
        photo_base64: photoBase64,
      }

      const { data: response, error: fnError } = await supabase.functions.invoke(
        'submit-report',
        { body: payload }
      )

      if (fnError) {
        setError(await extractFunctionError(fnError))
        return null
      }

      recordSubmission()
      return response as SubmitReportResponse
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      return null
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { submit, isSubmitting, error }
}
