// Supabase Edge Function: weekly-digest
// Emails each council a summary of last week's reports.
// Source: PRD §5.4 ("weekly auto-generated summary reports"), MASTERPLAN S21.3
//
// ── Why this exists ──
// PRD §5.4 names weekly summary reports as a Phase 3 end-state deliverable
// alongside the dashboard, CSV export and batch status updates. Everything in
// that sentence shipped except this. The dashboard is pull; a coordinator whose
// system of record is their inbox (PRD §4) needs push.
//
// ── Invocation ──
// Intended to be called by pg_cron on Monday morning (the statement is written
// out in migration 027, deliberately left commented — scheduling real email to
// real councils is an owner decision, not a migration's). It can also be
// invoked manually, and `dry_run` renders without sending so the output can be
// checked before anyone's inbox is involved.
//
// ── Authorisation ──
// Service-role only. There is no per-user path here: this function reads across
// every council and sends mail, which no client should ever be able to trigger.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@4.3.6";

const DigestSchema = z.object({
  // Defaults to last week. Explicit only for backfills and for testing.
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  council_id: z.string().uuid().optional(),
  dry_run: z.boolean().optional(),
});

interface WeeklySummary {
  council_id: string;
  council_name: string;
  week_start: string;
  week_end: string;
  new_reports: number;
  acknowledged: number;
  resolved: number;
  still_open: number;
  median_days_to_fix: number | null;
  top_category: string | null;
  top_category_count: number;
  top_suburb: string | null;
  top_suburb_count: number;
  prior_week_reports: number;
  pct_change: number | null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    // An empty body is the common case (cron posts nothing), so parse
    // defensively rather than treating it as malformed.
    const raw = await req.json().catch(() => ({}));
    const parsed = DigestSchema.safeParse(raw);
    if (!parsed.success) return json(400, { error: "Invalid request" });
    const { week_start, council_id, dry_run } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin.rpc("council_weekly_summary", {
      p_council_id: council_id ?? null,
      p_week_start: week_start ?? null,
    });

    if (error) {
      console.error("council_weekly_summary failed:", error.message);
      return json(500, { error: "Summary query failed" });
    }

    const summaries = (data ?? []) as WeeklySummary[];
    const results: { council: string; sent: number; skipped?: string }[] = [];

    for (const s of summaries) {
      // A council with no activity gets no email. A weekly digest that arrives
      // every week saying nothing happened trains the recipient to filter it,
      // and then the week something does happen it goes unread too.
      if (s.new_reports === 0 && s.resolved === 0) {
        results.push({ council: s.council_name, sent: 0, skipped: "no activity" });
        continue;
      }

      // ── Idempotency ──
      // Claim the week BEFORE sending. UNIQUE(council_id, week_start) means a
      // retried or double-triggered cron loses the race here rather than in
      // someone's inbox. The cost of this ordering is that a send which fails
      // after the claim is not retried automatically — which is the right way
      // round: a missing digest is recoverable by hand, a duplicate one is not.
      if (!dry_run) {
        const { error: claimError } = await admin
          .from("council_digest_log")
          .insert({ council_id: s.council_id, week_start: s.week_start, recipients: 0 });

        if (claimError) {
          results.push({ council: s.council_name, sent: 0, skipped: "already sent" });
          continue;
        }
      }

      const recipients = await councilRecipients(admin, s.council_id);
      if (recipients.length === 0) {
        results.push({ council: s.council_name, sent: 0, skipped: "no recipients" });
        continue;
      }

      const html = renderDigest(s);
      if (dry_run) {
        results.push({ council: s.council_name, sent: 0, skipped: "dry run" });
        continue;
      }

      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        // Owner-gated (OG5). Same posture as send-notification: log and
        // succeed rather than failing, so a missing key is visibly a
        // configuration gap and not a broken function.
        console.warn("RESEND_API_KEY not set — skipping", recipients.length, "digest email(s)");
        results.push({ council: s.council_name, sent: 0, skipped: "email not configured" });
        continue;
      }

      let sent = 0;
      for (const email of recipients) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Ripple <reports@ripple.app>",
              to: email,
              subject: `${s.council_name}: ${s.new_reports} new report${s.new_reports === 1 ? "" : "s"} last week`,
              html,
            }),
          });
          if (res.ok) sent++;
          else console.error("Resend rejected a digest:", res.status);
        } catch (err) {
          // One bad address must not stop the rest of the batch.
          console.error("Digest send failed:", err instanceof Error ? err.message : err);
        }
      }

      await admin
        .from("council_digest_log")
        .update({ recipients: sent })
        .eq("council_id", s.council_id)
        .eq("week_start", s.week_start);

      results.push({ council: s.council_name, sent });
    }

    return json(200, { councils: results.length, results });
  } catch (err) {
    console.error("weekly-digest failed:", err instanceof Error ? err.message : err);
    return json(500, { error: "Unexpected error" });
  }
});

/**
 * Council staff addresses.
 *
 * Reads the council record rather than user_notifications: that table holds
 * *citizens'* opt-in addresses (PRD §13.2) and using it here would email
 * residents an internal operations report about themselves.
 */
async function councilRecipients(
  admin: ReturnType<typeof createClient>,
  councilId: string,
): Promise<string[]> {
  const { data } = await admin
    .from("councils")
    .select("contact_email")
    .eq("id", councilId)
    .maybeSingle();

  const email = (data as { contact_email?: string | null } | null)?.contact_email;
  return email ? [email] : [];
}

/**
 * Plain inlined HTML, matching send-notification.
 *
 * The reasoning there applies unchanged: Gmail strips <style> blocks, so any
 * component library's output has to be inlined anyway, and a build step for one
 * template is not worth it in a Deno function.
 */
function renderDigest(s: WeeklySummary): string {
  const row = (label: string, value: string) =>
    `<tr>
       <td style="padding:6px 0;color:#98928a;">${escapeHtml(label)}</td>
       <td style="padding:6px 0;text-align:right;font-family:monospace;color:#f0ece4;">${escapeHtml(value)}</td>
     </tr>`;

  // Omitted entirely rather than rendered as "n/a": a row that says nothing
  // still costs the reader a line, and this is a five-line email by design.
  const median = s.median_days_to_fix !== null
    ? row("Median days to fix", `${s.median_days_to_fix}`)
    : "";

  // The honesty guard from migration 027 carried into the copy: pct_change is
  // NULL when last week's base was under five reports, and no sentence is
  // written in that case. "Up 300%" from one report to four is noise printed
  // as a headline.
  const trend = s.pct_change !== null
    ? `<p style="color:#98928a;margin:16px 0 0;">
         ${s.pct_change >= 0 ? "Up" : "Down"} ${Math.abs(s.pct_change)}% on the week before
         (${s.prior_week_reports} report${s.prior_week_reports === 1 ? "" : "s"}).
       </p>`
    : "";

  const busiest = s.top_category
    ? `<p style="color:#98928a;margin:16px 0 0;">
         Most reported: <span style="color:#f0ece4;">${escapeHtml(s.top_category)}</span>
         (${s.top_category_count})${
           s.top_suburb
             ? `, concentrated in <span style="color:#f0ece4;">${escapeHtml(s.top_suburb)}</span> (${s.top_suburb_count})`
             : ""
         }.
       </p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#050505;color:#f0ece4;font-family:-apple-system,Segoe UI,sans-serif;">
  <div style="max-width:520px;margin:0 auto;">
    <p style="font-family:monospace;color:#ffb000;letter-spacing:2px;margin:0 0 24px;">RIPPLE</p>
    <p style="font-size:18px;margin:0 0 4px;">${escapeHtml(s.council_name)}</p>
    <p style="color:#98928a;margin:0 0 24px;font-family:monospace;">
      Week of ${escapeHtml(s.week_start)}
    </p>

    <table style="width:100%;border-collapse:collapse;border-top:1px solid #2c2925;">
      ${row("New reports", String(s.new_reports))}
      ${row("Acknowledged", String(s.acknowledged))}
      ${row("Resolved", String(s.resolved))}
      ${row("Still open", String(s.still_open))}
      ${median}
    </table>

    ${busiest}
    ${trend}

    <p style="margin:24px 0 0;">
      <a href="https://ripple.app/council" style="color:#ffb000;text-decoration:none;">Open the dashboard →</a>
    </p>
    <p style="color:#57534e;font-size:12px;margin:24px 0 0;">
      Median, not mean: one long-open report should not make a good week look bad.
    </p>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
