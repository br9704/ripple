// Supabase Edge Function: send-notification
// Emails opted-in reporters and upvoters when a report's status changes.
// Source: PRD §6.5, MASTERPLAN S13.4/S13.5

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@4.3.6";

const NotifySchema = z.object({
  report_id: z.string().uuid(),
  new_status: z.string(),
  council_note: z.string().nullish(),
});

const STATUS_LABELS: Record<string, string> = {
  reported: "Reported",
  acknowledged: "Acknowledged",
  in_progress: "In Progress",
  fixed: "Fixed",
  declined: "Declined",
  wont_fix: "Won't Fix",
};

// PRD §6.5: no notification for internal churn — only these transitions are
// worth interrupting someone for.
const NOTIFIABLE = new Set(["acknowledged", "in_progress", "fixed", "declined"]);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const parsed = NotifySchema.safeParse(await req.json());
    if (!parsed.success) return json(400, { error: "Invalid request" });

    const { report_id, new_status, council_note } = parsed.data;
    if (!NOTIFIABLE.has(new_status)) {
      return json(200, { sent: 0, skipped: "status not notifiable" });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: report } = await admin
      .from("reports")
      .select("id, category, address, suburb")
      .eq("id", report_id)
      .maybeSingle();

    if (!report) return json(404, { error: "Report not found" });

    // Opted-in recipients only. user_notifications is written solely when a
    // user supplies an email; there is no implicit subscription anywhere.
    const { data: subscriptions } = await admin
      .from("user_notifications")
      .select("email")
      .eq("report_id", report_id)
      .eq("notification_type", "email")
      .eq("is_active", true)
      .not("email", "is", null);

    const recipients = [...new Set((subscriptions ?? []).map((s) => s.email as string))];
    if (recipients.length === 0) return json(200, { sent: 0 });

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      // Owner-gated (OG5). Log and succeed rather than failing the caller: a
      // missing email key must not roll back a status change that already
      // happened.
      console.warn("RESEND_API_KEY not set — skipping", recipients.length, "email(s)");
      return json(200, { sent: 0, skipped: "email not configured" });
    }

    const label = STATUS_LABELS[new_status] ?? new_status;
    const where = report.address ?? report.suburb ?? "your reported location";
    const subject = `Your Ripple report has been ${label.toLowerCase()}`;

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
            from: "Ripple <notifications@ripple.app>",
            to: email,
            subject,
            html: renderEmail({ label, where, category: report.category, council_note, report_id }),
          }),
        });
        if (res.ok) sent++;
        else console.error("Resend rejected a message:", res.status);
      } catch (err) {
        // One bad address must not stop the rest of the batch.
        console.error("Send failed:", err instanceof Error ? err.message : err);
      }
    }

    return json(200, { sent });
  } catch (err) {
    console.error("send-notification failed:", err instanceof Error ? err.message : err);
    return json(500, { error: "Unexpected error" });
  }
});

/**
 * Plain inlined HTML rather than React Email.
 *
 * MASTERPLAN S13.5 specified React Email, but it would add a build step to a
 * Deno function for one template. Inline styles are also what email clients
 * actually honour — Gmail strips <style> blocks, so a component library's
 * output has to be inlined anyway.
 */
function renderEmail(p: {
  label: string;
  where: string;
  category: string;
  council_note?: string | null;
  report_id: string;
}): string {
  const note = p.council_note
    ? `<p style="margin:16px 0;padding-left:12px;border-left:2px solid #2c2925;color:#98928a;">${escapeHtml(p.council_note)}</p>`
    : "";

  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#050505;color:#f0ece4;font-family:-apple-system,Segoe UI,sans-serif;">
  <div style="max-width:480px;margin:0 auto;">
    <p style="font-family:monospace;color:#ffb000;letter-spacing:2px;margin:0 0 24px;">RIPPLE</p>
    <p style="font-size:18px;margin:0 0 8px;">Your report has been <strong>${escapeHtml(p.label)}</strong></p>
    <p style="color:#98928a;margin:0 0 4px;">${escapeHtml(p.category)}</p>
    <p style="color:#98928a;margin:0;">${escapeHtml(p.where)}</p>
    ${note}
    <p style="margin:24px 0 0;">
      <a href="https://ripple.app/report/${encodeURIComponent(p.report_id)}"
         style="color:#ffb000;text-decoration:none;">View your report →</a>
    </p>
    <p style="margin-top:32px;font-size:12px;color:#55504a;">
      You receive this because you asked for updates on this report. Ripple never
      shares your email and stores it only to send these notifications.
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
