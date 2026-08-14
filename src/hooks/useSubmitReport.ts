import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { blobToBase64 } from '@/lib/blobToBase64'
import { MAX_REPORTS_PER_HOUR } from '@/constants/config'
import type { ReportCategory, SubmitReportResponse } from '@/types'

const RATE_LIMIT_KEY = 'ripple_report_timestamps'

export interface ReportSubmitData {
  photo: Blob
  category: ReportCategory
  lat: number
  lng: number
  address: string | null
  suburb: string | null
  postcode: string | null
  council_id: string | null
  note: string
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
        ai_category: data.category, // Placeholder until Sprint 7 (AI classification)
        ai_confidence: 0,
        user_corrected_ai: false,
        lat: data.lat,
        lng: data.lng,
        address: data.address,
        suburb: data.suburb,
        postcode: data.postcode,
        council_id: data.council_id,
        note: data.note || undefined,
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
