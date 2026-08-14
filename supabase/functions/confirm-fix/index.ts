// Supabase Edge Function: confirm-fix
// Community photo confirmation that an issue is resolved.
// Source: PRD §6.5, MASTERPLAN S15

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.220.0/encoding/base64.ts";
import { z } from "https://esm.sh/zod@4.3.6";

const ConfirmSchema = z.object({
  report_id: z.string().uuid(),
  reporter_token: z.string().min(1),
  photo_base64: z.string().min(1),
});

// PRD §6.5: at 3 confirmations the council dashboard is told the community
// believes this is fixed. It is a suggestion, never an automatic status change
// — only a council closes a report.
const SUGGEST_FIXED_AT = 3;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const parsed = ConfirmSchema.safeParse(await req.json());
    if (!parsed.success) return json(400, { error: "Invalid request" });

    const { report_id, reporter_token, photo_base64 } = parsed.data;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: report } = await admin
      .from("reports")
      .select("id, status")
      .eq("id", report_id)
      .maybeSingle();

    if (!report) return json(404, { error: "Report not found" });
    if (report.status === "fixed") {
      return json(200, { confirmations: 0, alreadyFixed: true });
    }

    // One confirmation per token: without this, a single person could photograph
    // the same patched pothole three times and trip the council suggestion.
    const { data: existing } = await admin
      .from("report_photos")
      .select("id")
      .eq("report_id", report_id)
      .eq("photo_type", "fixed_confirmation")
      .eq("uploaded_by_token", reporter_token)
      .maybeSingle();

    if (existing) return json(200, { alreadyConfirmed: true });

    const now = new Date();
    const path = `reports/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/fix-${crypto.randomUUID()}.jpg`;

    const { error: uploadError } = await admin.storage
      .from("reports")
      .upload(path, base64Decode(photo_base64), { contentType: "image/jpeg", upsert: false });

    if (uploadError) return json(500, { error: "Failed to upload photo" });

    const { data: urlData } = admin.storage.from("reports").getPublicUrl(path);

    await admin.from("report_photos").insert({
      report_id,
      storage_path: path,
      public_url: urlData.publicUrl,
      photo_type: "fixed_confirmation",
      uploaded_by_token: reporter_token,
    });

    const { count } = await admin
      .from("report_photos")
      .select("id", { count: "exact", head: true })
      .eq("report_id", report_id)
      .eq("photo_type", "fixed_confirmation");

    const confirmations = count ?? 0;

    if (confirmations >= SUGGEST_FIXED_AT) {
      // Flag for the council, do NOT set status. Community consensus is
      // evidence, not authority — PRD §6.5 reserves 'fixed' for the council.
      await admin
        .from("reports")
        .update({ community_suggests_fixed: true })
        .eq("id", report_id);
    }

    return json(200, { confirmations, suggestsFixed: confirmations >= SUGGEST_FIXED_AT });
  } catch (err) {
    console.error("confirm-fix failed:", err instanceof Error ? err.message : err);
    return json(500, { error: "Unexpected error" });
  }
});

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
