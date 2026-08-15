// Supabase Edge Function: assign-crew
// Council-authenticated write of a report's internal crew ticket reference.
// Source: PRD §6.7 F007 ("Assign to crew (Phase 3): link report to internal
// crew ticket number"), migration 024, MASTERPLAN S21.2.
//
// ── Why a function at all, when RLS already scopes the write ──
// Migration 020's reports_update_council policy does scope UPDATE to the
// caller's own council, and anon has no UPDATE policy at all, so a direct
// PostgREST write from the dashboard would be *safe*. It would not be
// *legible*, for two reasons:
//
//   1. RLS scopes ROWS, not COLUMNS, and a direct write lets the client choose
//      the shape of the patch. Migration 024 is explicit that crew_assigned_at
//      is "Set by trigger, never by the client" — but its trigger only
//      re-stamps when the ref itself changes, so a patch carrying
//      crew_assigned_at alone writes straight through. Here the patch shape is
//      a server-side constant: this function writes exactly one column and
//      there is no field a caller can add to change that. It is worth being
//      precise about what that does and does not buy — a coordinator's JWT
//      still works against PostgREST directly, so this closes the hole in *our*
//      write path, not in the database. The database-level fix is a column
//      grant — the technique migration 025 uses to stop anon reading
//      reporter_token — which is a migration, and migrations are not this
//      task's to write.
//
//   2. An RLS rejection is not an error. PostgREST answers an out-of-scope
//      UPDATE with a 200 and zero rows, so the dashboard would render a
//      success for a write that never happened. update-status already added an
//      explicit scope check for exactly this reason ("returns a comprehensible
//      403 instead of a silent zero-row update"); a coordinator working a queue
//      needs the same answer here.
//
// ── Why not extend update-status ──
// That function's job is the citizen-facing timeline: it writes status history
// through the 017 trigger and dispatches a notification email. A crew ticket
// ref is internal — the citizen is not told, and must not be. Making
// new_status optional there would fork one function into two modes and put an
// internal-only write inside the one thing that emails the public.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@4.3.6";

/** Mirrors migration 024's CHECK constraint: 1–64 characters after btrim. */
const MAX_TICKET_REF = 64;

/** Postgres check_violation. The 024 constraint is the only one reachable here. */
const PG_CHECK_VIOLATION = "23514";

const AssignCrewSchema = z.object({
  report_id: z.string().uuid(),
  // Nullable rather than optional: `null` IS the clear operation. An optional
  // field would make "unassign this report" indistinguishable from "leave the
  // assignment alone", and a coordinator needs both.
  crew_ticket_ref: z.string().nullable(),
});

// The length rule lives in its own schema, applied *after* trimming, for two
// reasons. Migration 024's CHECK is on btrim(), so a 64-character ref with a
// trailing space is legal and must not be rejected. And keeping it separate is
// what lets a too-long ref answer with its own code instead of being
// indistinguishable from a malformed body inside one Zod issue list.
const TicketRefSchema = z.string().max(MAX_TICKET_REF).nullable();

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return fail(405, "invalid", "Method not allowed");

  try {
    const parsed = AssignCrewSchema.safeParse(await req.json());
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return fail(400, "invalid", first?.message ?? "Invalid request");
    }
    const { report_id } = parsed.data;

    // Normalise exactly as the 024 trigger does — btrim, then whitespace-only
    // becomes NULL — so the value this function decides to write is the value
    // the database will store. Doing it here as well as there is not
    // duplication for its own sake: it is what makes the unchanged-check below
    // compare like with like.
    const trimmed = parsed.data.crew_ticket_ref?.trim() ?? null;
    const normalised = trimmed === null || trimmed.length === 0 ? null : trimmed;

    const refCheck = TicketRefSchema.safeParse(normalised);
    if (!refCheck.success) {
      return fail(400, "too_long", `Crew ticket ref must be ${MAX_TICKET_REF} characters or fewer`);
    }

    // ── Caller must be an authenticated council user ──
    // Verified against the caller's own JWT, not the service role: using the
    // service role to *check* identity would make every anonymous request look
    // like a council. Same model as update-status, deliberately.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return fail(401, "unauthenticated", "Authentication required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await asCaller.auth.getUser();
    if (authError || !user) return fail(401, "unauthenticated", "Authentication required");

    const councilId = (user.app_metadata as Record<string, unknown>)?.council_id;
    if (typeof councilId !== "string") {
      return fail(403, "forbidden", "Account is not linked to a council");
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // ── Scope check: a council may only assign crew on its own reports ──
    // RLS is still the real boundary; this exists so the answer is a 403 a
    // coordinator can read rather than a zero-row 200 they cannot.
    const { data: report, error: fetchError } = await admin
      .from("reports")
      .select("id, council_id, crew_ticket_ref, crew_assigned_at")
      .eq("id", report_id)
      .maybeSingle();

    if (fetchError) return fail(500, "server", "Could not load report");
    if (!report) return fail(404, "not_found", "Report not found");
    if (report.council_id !== councilId) {
      return fail(403, "forbidden", "Report belongs to a different council");
    }

    // Stored refs are already trigger-normalised, so this compares like with
    // like. The 024 trigger keys off IS DISTINCT FROM and would decline to
    // re-stamp anyway — this saves the round trip rather than enforcing a rule.
    if (report.crew_ticket_ref === normalised) {
      return json(200, {
        report_id,
        crew_ticket_ref: report.crew_ticket_ref,
        crew_assigned_at: report.crew_assigned_at,
        unchanged: true,
      });
    }

    // Exactly one column. crew_assigned_at is stamped by the 024 trigger and is
    // deliberately absent from this patch — a council must not be able to
    // backdate an assignment, because resolution time is the number this
    // product exists to expose.
    const { data: updated, error: updateError } = await admin
      .from("reports")
      .update({ crew_ticket_ref: normalised })
      .eq("id", report_id)
      .select("crew_ticket_ref, crew_assigned_at")
      .maybeSingle();

    if (updateError) {
      // Unreachable via this function's own validation, but the constraint is
      // the authority on the rule and should be reported as itself if it ever
      // disagrees with the schema above.
      if (updateError.code === PG_CHECK_VIOLATION) {
        return fail(400, "too_long", `Crew ticket ref must be ${MAX_TICKET_REF} characters or fewer`);
      }
      return fail(500, "server", "Could not save crew ticket");
    }
    if (!updated) return fail(404, "not_found", "Report not found");

    // The response carries the row as the database left it — the ref after the
    // trigger's btrim, and a timestamp the client never computes. A client that
    // rendered its own "assigned just now" would be inventing the one field
    // migration 024 says it must never supply.
    return json(200, {
      report_id,
      crew_ticket_ref: updated.crew_ticket_ref,
      crew_assigned_at: updated.crew_assigned_at,
    });
  } catch (err) {
    console.error("assign-crew failed:", err instanceof Error ? err.message : err);
    return fail(500, "server", "Unexpected error");
  }
});

/**
 * Failure responses carry a stable machine code alongside the human message.
 *
 * The client maps the code, never the message. Sniffing an error string for
 * "too long" is how a copy edit silently becomes a behaviour change, and the
 * dashboard has to tell a length rejection apart from an RLS one to say
 * anything useful to the coordinator.
 */
function fail(status: number, code: string, error: string): Response {
  return json(status, { code, error });
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
