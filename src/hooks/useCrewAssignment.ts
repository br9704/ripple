import { useCallback } from 'react'
import { supabase } from '@/lib/supabase'

/**
 * Mirrors migration 024's CHECK constraint: 1–64 characters after trim.
 *
 * Defined here rather than in `src/constants/config.ts` because this sprint
 * splits ownership of that file across agents; it belongs there once the sprint
 * closes. The number is the constraint's, not a UI preference — the input's
 * maxLength, the Edge Function's schema and the database CHECK all have to
 * agree or a coordinator gets a rejection they could not have predicted.
 */
export const MAX_CREW_TICKET_REF_LENGTH = 64

/**
 * The two columns migration 024 adds to `reports`.
 *
 * Local to this file rather than added to `src/types`, which another agent owns
 * this sprint. Snake_case because these are column names as the server returns
 * them, and renaming them on the way in would hide that.
 */
export interface CrewAssignmentValue {
  crew_ticket_ref: string | null
  crew_assigned_at: string | null
}

/**
 * Every way assigning a crew ticket can fail, as a closed set.
 *
 * `offline` is the only one the client decides on its own; the rest are the
 * `code` the assign-crew function returns. A closed union rather than a string
 * so that adding a failure mode to the server forces a decision about what the
 * coordinator sees, instead of silently falling through to "something failed".
 */
export type CrewAssignmentFailure =
  | 'offline'
  | 'invalid'
  | 'too_long'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'server'

export type CrewAssignmentResult =
  | { ok: true; value: CrewAssignmentValue }
  | { ok: false; reason: CrewAssignmentFailure; message: string }

/**
 * Coordinator-facing wording, lowercase to match the dashboard's terminal voice.
 *
 * The messages live on the client and the codes on the server, so rewording
 * this map cannot change behaviour and changing behaviour cannot be done by
 * rewording a server string.
 */
const FAILURE_MESSAGES: Record<CrewAssignmentFailure, string> = {
  offline: 'offline — ticket not saved',
  invalid: 'the server rejected that ticket',
  too_long: `ticket ref must be ${MAX_CREW_TICKET_REF_LENGTH} characters or fewer`,
  unauthenticated: 'session expired — sign in again',
  forbidden: 'that report belongs to a different council',
  not_found: 'that report no longer exists',
  server: 'could not save the ticket — try again',
}

const KNOWN_FAILURES = new Set<string>(Object.keys(FAILURE_MESSAGES))

/**
 * Normalises a typed ref exactly as migration 024's trigger does: trim, and
 * whitespace-only becomes NULL.
 *
 * Kept identical to the trigger on purpose. The column has two meaningful
 * states, not three, and a client that treats `'   '` as an assignment would
 * show a coordinator a ticket the database has recorded as absent.
 */
export function normaliseTicketRef(raw: string): string | null {
  const trimmed = raw.trim()
  return trimmed.length === 0 ? null : trimmed
}

/**
 * The length rule, checked before the network call.
 *
 * The database CHECK is the authority and the Edge Function re-checks it; this
 * exists so a coordinator who pastes an over-long ref finds out immediately
 * rather than after a round trip. Measured on the *trimmed* value because the
 * constraint is `char_length(btrim(...))`, so a 64-character ref with a
 * trailing space is legal.
 */
export function validateTicketRef(raw: string): CrewAssignmentFailure | null {
  const normalised = normaliseTicketRef(raw)
  if (normalised !== null && normalised.length > MAX_CREW_TICKET_REF_LENGTH) return 'too_long'
  return null
}

/**
 * Turns a failed `functions.invoke` into a reason the UI can act on.
 *
 * supabase-js v2 sets one message for every non-2xx response and hangs the real
 * body off `context`, an undrained `Response` — the same trap `extractFunctionError`
 * documents on the submit path. An invoke error with no `Response` at all never
 * reached the server, which in practice means the network went away between the
 * `navigator.onLine` check and the request.
 */
export async function describeCrewFailure(fnError: unknown): Promise<CrewAssignmentFailure> {
  const context = (fnError as { context?: unknown })?.context
  if (!(context instanceof Response)) return 'offline'

  try {
    const body: unknown = await context.clone().json()
    const code = (body as Record<string, unknown> | null)?.code
    if (typeof code === 'string' && KNOWN_FAILURES.has(code)) {
      return code as CrewAssignmentFailure
    }
  } catch {
    // Not JSON — a proxy or gateway answered instead of the function. Fall
    // through to the status mapping rather than reporting the parse failure,
    // which is not something a coordinator can act on.
  }

  // A response with no usable body still has a status, and the status alone is
  // enough to tell "not yours" from "broken" — the distinction that decides
  // whether retrying is worth the coordinator's time.
  if (context.status === 401) return 'unauthenticated'
  if (context.status === 403) return 'forbidden'
  if (context.status === 404) return 'not_found'
  return 'server'
}

export function crewFailureMessage(reason: CrewAssignmentFailure): string {
  return FAILURE_MESSAGES[reason]
}

export interface UseCrewAssignment {
  /**
   * Writes `raw` as the report's crew ticket ref. An empty or whitespace-only
   * string clears the assignment, matching the trigger.
   */
  assign: (reportId: string, raw: string) => Promise<CrewAssignmentResult>
}

/**
 * Crew ticket assignment (PRD §6.7 F007, migration 024).
 *
 * Holds no state on purpose. Two rows in the queue can be in flight at once —
 * a coordinator who tabs on before the first save lands — and a shared
 * `isSaving` would put one row's progress line on the other. Each row owns its
 * own pending flag; this hook owns only the call and what its failures mean.
 */
export function useCrewAssignment(): UseCrewAssignment {
  const assign = useCallback(
    async (reportId: string, raw: string): Promise<CrewAssignmentResult> => {
      const lengthProblem = validateTicketRef(raw)
      if (lengthProblem) {
        return { ok: false, reason: lengthProblem, message: crewFailureMessage(lengthProblem) }
      }

      // Checked before the call rather than inferred from the failure, so an
      // offline coordinator gets an honest answer instantly instead of waiting
      // out a fetch timeout. CLAUDE.md §4: offline is a state, not an error —
      // but a write that did not happen must never look like one that did, so
      // this is refused rather than queued. The offline report queue exists for
      // citizen submissions, where the payload is self-contained; a crew ref
      // replayed hours later would stamp crew_assigned_at at replay time and
      // quietly misreport when the work was actually dispatched.
      if (!navigator.onLine) {
        return { ok: false, reason: 'offline', message: crewFailureMessage('offline') }
      }

      const { data, error } = await supabase.functions.invoke('assign-crew', {
        body: { report_id: reportId, crew_ticket_ref: normaliseTicketRef(raw) },
      })

      if (error) {
        const reason = await describeCrewFailure(error)
        return { ok: false, reason, message: crewFailureMessage(reason) }
      }

      // The server's own row, not a locally reconstructed one: crew_assigned_at
      // is the trigger's to set and the client has no business guessing it.
      const value = data as CrewAssignmentValue | null
      if (!value) {
        return { ok: false, reason: 'server', message: crewFailureMessage('server') }
      }

      return {
        ok: true,
        value: {
          crew_ticket_ref: value.crew_ticket_ref ?? null,
          crew_assigned_at: value.crew_assigned_at ?? null,
        },
      }
    },
    []
  )

  return { assign }
}
