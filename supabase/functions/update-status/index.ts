// Supabase Edge Function: update-status
// Council-authenticated status change with an optional public note.
// Source: PRD §9.2, MASTERPLAN S13.1

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@4.3.6";

const VALID_STATUSES = [
  "reported", "acknowledged", "in_progress", "fixed", "declined", "wont_fix",
] as const;

const UpdateStatusSchema = z.object({
  report_id: z.string().uuid(),
  new_status: z.enum(VALID_STATUSES),
  council_note: z.string().max(500).optional(),
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const parsed = UpdateStatusSchema.safeParse(await req.json());
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      return json(400, { error: first?.message ?? "Invalid request" });
    }
    const { report_id, new_status, council_note } = parsed.data;

    // ── Caller must be an authenticated council user ──
    // Verified against the caller's own JWT, not the service role: using the
    // service role to *check* identity would make every anonymous request look
    // like a council.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { error: "Authentication required" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const asCaller = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await asCaller.auth.getUser();
    if (authError || !user) return json(401, { error: "Authentication required" });

    const councilId = (user.app_metadata as Record<string, unknown>)?.council_id;
    if (typeof councilId !== "string") {
      return json(403, { error: "Account is not linked to a council" });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // ── Scope check: a council may only update its own reports ──
    // Enforced here as well as by RLS. RLS is the real boundary, but this
    // returns a comprehensible 403 instead of a silent zero-row update.
    const { data: report, error: fetchError } = await admin
      .from("reports")
      .select("id, council_id, status")
      .eq("id", report_id)
      .maybeSingle();

    if (fetchError) return json(500, { error: "Could not load report" });
    if (!report) return json(404, { error: "Report not found" });
    if (report.council_id !== councilId) {
      return json(403, { error: "Report belongs to a different council" });
    }
    if (report.status === new_status) {
      // Not an error, but skip the write so the 017 trigger does not record a
      // no-op transition in the public timeline.
      return json(200, { report_id, status: new_status, unchanged: true });
    }

    // status_updated_at, fixed_at, status_history and priority_score are all
    // handled by the 017 trigger — deliberately not duplicated here, so there
    // is exactly one place that knows the rules.
    const { error: updateError } = await admin
      .from("reports")
      .update({ status: new_status, council_note: council_note ?? null })
      .eq("id", report_id);

    if (updateError) return json(500, { error: "Could not update status" });

    // Notification dispatch is fire-and-forget: a citizen's status change must
    // land even if the email provider is having a bad day.
    try {
      await admin.functions.invoke("send-notification", {
        body: { report_id, new_status, council_note: council_note ?? null },
      });
    } catch (err) {
      console.error("Notification dispatch failed:", err instanceof Error ? err.message : err);
    }

    return json(200, { report_id, status: new_status });
  } catch (err) {
    console.error("update-status failed:", err instanceof Error ? err.message : err);
    return json(500, { error: "Unexpected error" });
  }
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
