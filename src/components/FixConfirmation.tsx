import { useState } from 'react'
import { useCameraCapture } from '@/hooks/useCameraCapture'
import { blobToBase64 } from '@/lib/blobToBase64'
import { supabase } from '@/lib/supabase'
import { getReporterToken } from '@/lib/reporterToken'
import { TypingLine } from '@/components/TypingLine'
import type { ReportStatus } from '@/types'

interface FixConfirmationProps {
  reportId: string
  status: ReportStatus
  /** True when this device submitted the original report. */
  isOwnReport: boolean
  confirmationCount: number
}

/**
 * "It's fixed" — community photo confirmation (PRD §6.5).
 *
 * Anyone can confirm, no account needed, reusing the Sprint 3 camera pipeline
 * rather than a second capture path. At three confirmations the council
 * dashboard surfaces "community suggests fixed"; the threshold is enforced
 * server-side, not here.
 *
 * Hidden once a report is already fixed — confirming a resolved issue is noise,
 * and the celebration below is the payoff instead.
 */
export function FixConfirmation({
  reportId,
  status,
  isOwnReport,
  confirmationCount,
}: FixConfirmationProps) {
  const { photo, isProcessing, capture, handleFileChange, inputRef } = useCameraCapture()
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  // The emotional payoff of the whole product (MOTION.md). Only for the person
  // who reported it, and only once it is actually fixed.
  if (status === 'fixed') {
    return (
      <section className="border border-status-fixed px-4 py-3">
        <p className="font-mono text-xs text-status-fixed">
          &gt; {isOwnReport ? 'you reported this — it’s fixed' : 'this has been fixed'}
        </p>
      </section>
    )
  }

  const submit = async () => {
    if (!photo) return
    setState('sending')

    const { error } = await supabase.functions.invoke('confirm-fix', {
      body: {
        report_id: reportId,
        reporter_token: getReporterToken(),
        photo_base64: await blobToBase64(photo),
      },
    })

    setState(error ? 'error' : 'done')
  }

  if (state === 'done') {
    return (
      <section className="border border-border px-4 py-3">
        <TypingLine text="thanks — your confirmation was recorded" />
      </section>
    )
  }

  return (
    <section aria-label="Confirm this is fixed" className="space-y-2 border border-border px-4 py-3">
      <p className="font-mono text-xs text-text-secondary">&gt; has this been fixed?</p>

      {confirmationCount > 0 && (
        <p className="font-mono text-xs text-text-tertiary tabular-nums">
          {confirmationCount} {confirmationCount === 1 ? 'person has' : 'people have'} confirmed
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => { void handleFileChange(e) }}
        className="hidden"
        aria-hidden="true"
      />

      {photo ? (
        <button
          type="button"
          onClick={() => { void submit() }}
          disabled={state === 'sending'}
          className="w-full border border-action px-3 py-2 font-mono text-xs text-action transition-colors hover:bg-action hover:text-bg-primary disabled:opacity-40"
        >
          {state === 'sending' ? '[sending...]' : '[ submit confirmation ]'}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => { capture() }}
          disabled={isProcessing}
          className="w-full border border-border-bright px-3 py-2 font-mono text-xs text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40"
        >
          {isProcessing ? '[processing...]' : '[ photograph the fix ]'}
        </button>
      )}

      {state === 'error' && (
        <p className="font-mono text-xs text-text-tertiary">&gt; could not send — try again</p>
      )}
    </section>
  )
}
