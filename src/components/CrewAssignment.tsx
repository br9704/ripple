import { useEffect, useRef, useState } from 'react'
import { TypingLine } from '@/components/TypingLine'
import { timeAgo } from '@/lib/mapHelpers'
import {
  useCrewAssignment,
  normaliseTicketRef,
  MAX_CREW_TICKET_REF_LENGTH,
  type CrewAssignmentValue,
} from '@/hooks/useCrewAssignment'

export interface CrewAssignmentProps {
  reportId: string
  /** As the server last returned it — already trigger-trimmed. */
  ticketRef: string | null
  assignedAt: string | null
  /** Handed the server's own row, never a locally reconstructed one. */
  onAssigned: (reportId: string, value: CrewAssignmentValue) => void
}

/**
 * Inline crew ticket assignment on a dashboard row (PRD §6.7 F007).
 *
 * Fully controlled: the dashboard owns the assignment and this owns only the
 * editing UI. That matters more than it looks — the dashboard refetches after a
 * batch status update, and a component holding its own copy of the ref would
 * keep showing the pre-refetch value with no way to know it had gone stale.
 *
 * Motion is deliberately thin. MOTION.md forbids spinners and forbids animation
 * on the critical input path, so the editor appears at once and the only moving
 * parts are 150ms colour transitions and the typing line that stands in for a
 * spinner while the write is in flight. All three are already reduced-motion
 * safe: index.css neutralises transitions globally under the media query, and
 * TypingLine reads the preference itself before starting any timer.
 */
export function CrewAssignment({ reportId, ticketRef, assignedAt, onAssigned }: CrewAssignmentProps) {
  const { assign } = useCrewAssignment()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)

  // Returning focus to the trigger on close is the difference between a
  // keyboard user carrying on down the queue and being dumped on <body> with
  // no idea where the caret went.
  useEffect(() => {
    if (wasEditing.current && !editing) triggerRef.current?.focus()
    wasEditing.current = editing
  }, [editing])

  const open = () => {
    setDraft(ticketRef ?? '')
    setError(null)
    setEditing(true)
  }

  const save = async (raw: string) => {
    setSaving(true)
    setError(null)
    const result = await assign(reportId, raw)
    setSaving(false)

    if (!result.ok) {
      // The editor stays open holding what was typed. A coordinator who loses
      // a pasted ticket number to a failed save has to go back to the other
      // system to find it again, which is the whole cost this feature exists
      // to remove.
      setError(result.message)
      return
    }

    onAssigned(reportId, result.value)
    setEditing(false)
  }

  if (editing) {
    return (
      <CrewEditor
        draft={draft}
        saving={saving}
        error={error}
        canClear={ticketRef !== null}
        onDraftChange={setDraft}
        onSave={() => void save(draft)}
        onClear={() => void save('')}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className="mt-1">
      <button
        ref={triggerRef}
        type="button"
        onClick={open}
        // min-h-[44px] is the iOS touch-target floor. It is generous for a
        // dense queue, but this control is tapped on a phone in a depot.
        className="inline-flex min-h-[44px] items-center font-mono text-xs transition-colors duration-150 ease-signal"
        aria-label={
          ticketRef ? `Change crew ticket ${ticketRef}` : 'Assign a crew ticket to this report'
        }
      >
        {ticketRef ? (
          <>
            <span className="text-action">crew {ticketRef}</span>
            {assignedAt && (
              <span className="ml-2 tabular-nums text-text-tertiary">
                assigned {timeAgo(assignedAt)}
              </span>
            )}
          </>
        ) : (
          <span className="text-text-tertiary hover:text-text-secondary">[+ crew ticket]</span>
        )}
      </button>
      {error && <CrewError message={error} />}
    </div>
  )
}

interface CrewEditorProps {
  draft: string
  saving: boolean
  error: string | null
  canClear: boolean
  onDraftChange: (value: string) => void
  onSave: () => void
  onClear: () => void
  onCancel: () => void
}

function CrewEditor({
  draft,
  saving,
  error,
  canClear,
  onDraftChange,
  onSave,
  onClear,
  onCancel,
}: CrewEditorProps) {
  const normalised = normaliseTicketRef(draft)
  const length = normalised?.length ?? 0
  const tooLong = length > MAX_CREW_TICKET_REF_LENGTH

  return (
    <div className="mt-1 flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={draft}
        autoFocus
        disabled={saving}
        onChange={(e) => onDraftChange(e.target.value)}
        onKeyDown={(e) => {
          // Enter saves and Escape backs out, because this is a queue: a
          // coordinator's hands should not have to leave the keyboard between
          // one row and the next.
          if (e.key === 'Enter' && !tooLong) onSave()
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="ticket ref"
        aria-label="Crew ticket reference"
        aria-invalid={tooLong}
        // No maxLength on purpose. Truncating a pasted ticket number would
        // silently store the WRONG reference, which is worse than refusing it —
        // the coordinator would have no way to tell the two apart later.
        className="min-h-[44px] w-full min-w-0 flex-1 border border-border-bright bg-bg-secondary px-2 py-1 font-mono text-xs text-text-primary placeholder:text-text-tertiary focus:border-action focus:outline-none disabled:opacity-40 sm:w-auto"
      />

      {saving ? (
        <TypingLine text="assigning..." className="basis-full" />
      ) : (
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={tooLong}
            onClick={onSave}
            className="min-h-[44px] border border-action px-2 font-mono text-xs text-action transition-colors duration-150 ease-signal hover:bg-action hover:text-bg-primary disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-action"
          >
            [save]
          </button>
          {canClear && (
            <button
              type="button"
              onClick={onClear}
              className="min-h-[44px] border border-border-bright px-2 font-mono text-xs text-text-secondary transition-colors duration-150 ease-signal hover:text-text-primary"
            >
              [clear]
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] px-1 font-mono text-xs text-text-tertiary transition-colors duration-150 ease-signal hover:text-text-secondary"
          >
            [esc]
          </button>
        </div>
      )}

      {/* The counter only appears once it is load-bearing. Shown always, it is
          noise on the 12-character refs every council actually uses. */}
      {length > MAX_CREW_TICKET_REF_LENGTH - 10 && (
        <span
          className={`basis-full font-mono text-xs tabular-nums ${
            tooLong ? 'text-action' : 'text-text-tertiary'
          }`}
        >
          {length}/{MAX_CREW_TICKET_REF_LENGTH}
        </span>
      )}

      {error && <CrewError message={error} />}
    </div>
  )
}

/**
 * Amber, not `--color-status-declined`.
 *
 * That token is the dashboard's usual error colour, but it measures 2.56:1 on
 * the warm-black background — well under WCAG AA's 4.5:1, and index.css already
 * records raising `--color-text-tertiary` for exactly this reason. A failed
 * write the coordinator cannot read is a write they will assume succeeded.
 * Amber measures 11.12:1 and is what CouncilAlerts already uses for the things
 * on this page that must be noticed.
 */
function CrewError({ message }: { message: string }) {
  return (
    <p role="alert" className="basis-full font-mono text-xs text-action">
      &gt; {message}
    </p>
  )
}
