// Supabase Edge Function: submit-report
// Validates, uploads photo to Storage, inserts report + photo record.
// Source: PRD Section 9.1

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.220.0/encoding/base64.ts";
import { z } from "https://esm.sh/zod@4.3.6";

const VALID_CATEGORIES = [
  "pothole", "streetlight", "graffiti", "signage",
  "accessibility", "dumping", "water", "tree", "footpath", "other",
] as const;

// CLAUDE.md §6 requires Zod for runtime validation of all Edge Function inputs.
// This replaces a hand-rolled `if` chain that MASTERPLAN S5.6 had already
// described as "Zod-style validation" — it was not.
const SubmitReportSchema = z.object({
  category: z.enum(VALID_CATEGORIES),
  ai_category: z.enum(VALID_CATEGORIES).optional(),
  ai_confidence: z.number().min(0).max(1).optional(),
  user_corrected_ai: z.boolean().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().nullish(),
  suburb: z.string().nullish(),
  postcode: z.string().nullish(),
  council_id: z.string().uuid().nullish(),
  note: z.string().max(140, "Note exceeds 140 character limit").optional(),
  reporter_token: z.string().min(1),
  // Opt-in status notifications (PRD §6.5). Absent for anonymous reports,
  // which is the default and the common case.
  notify_email: z.string().email().max(254).optional(),
  photo_base64: z.string().min(1),
  additional_photos: z.array(z.string()).max(2).optional(),
});

type SubmitReportBody = z.infer<typeof SubmitReportSchema>;

// PRD §10.3: 10 reports per reporter_token per hour.
const MAX_REPORTS_PER_HOUR = 10;

Deno.serve(async (req: Request) => {
  // CORS headers
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const raw = await req.json();

    // ── Validation ──
    const parsed = SubmitReportSchema.safeParse(raw);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      // Prefer a custom message when the schema supplies one; otherwise name
      // the offending field so the client shows something actionable.
      const path = first?.path?.join(".");
      const message = first?.message && !first.message.startsWith("Invalid input")
        ? first.message
        : `Invalid or missing ${path || "field"}`;
      return errorResponse(400, message);
    }
    const body: SubmitReportBody = parsed.data;

    // ── Supabase admin client (service role) ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ── Rate limiting (PRD §10.3) ──
    // The client-side check in useSubmitReport is a courtesy, not a control:
    // it lives in localStorage and one devtools click defeats it. This is the
    // enforcement point, because it is the only one the caller cannot reach.
    const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
    const { count: recentCount, error: rateError } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_token", body.reporter_token)
      .gte("submitted_at", oneHourAgo);

    if (rateError) {
      // Fail open on an infrastructure error: losing a citizen's report is a
      // worse outcome than briefly under-enforcing an anti-spam limit.
      console.error("Rate limit check failed:", rateError.message);
    } else if ((recentCount ?? 0) >= MAX_REPORTS_PER_HOUR) {
      return errorResponse(
        429,
        `Too many reports. Please wait before submitting another (max ${MAX_REPORTS_PER_HOUR}/hour).`,
      );
    }

    // ── Upload photo to Storage ──
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const photoId = crypto.randomUUID();
    const storagePath = `reports/${year}/${month}/${photoId}.jpg`;

    const photoBytes = base64Decode(body.photo_base64);

    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(storagePath, photoBytes, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      return errorResponse(500, "Failed to upload photo");
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("reports")
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // ── Duplicate detection (same category within 50m in last 30 days) ──
    // Using earthdistance extension: earth_distance(ll_to_earth(lat1, lng1), ll_to_earth(lat2, lng2))
    const { data: duplicates } = await supabase.rpc("find_nearby_reports", {
      p_lat: body.lat,
      p_lng: body.lng,
      p_category: body.category,
      p_radius_meters: 50,
      p_days: 30,
    }).limit(1);

    // ── Insert report ──
    const { data: report, error: insertError } = await supabase
      .from("reports")
      .insert({
        reporter_token: body.reporter_token,
        council_id: body.council_id ?? null,
        category: body.category,
        ai_category: body.ai_category ?? body.category,
        ai_confidence: body.ai_confidence ?? 0,
        user_corrected_ai: body.user_corrected_ai ?? false,
        lat: body.lat,
        lng: body.lng,
        address: body.address ?? null,
        suburb: body.suburb ?? null,
        postcode: body.postcode ?? null,
        note: body.note ?? null,
        status: "reported",
      })
      .select("id, lat, lng, category, status, upvote_count, priority_score, address, suburb, submitted_at")
      .single();

    if (insertError || !report) {
      console.error("Report insert error:", insertError?.message);
      return errorResponse(500, "Failed to create report");
    }

    // ── Insert photo record ──
    await supabase.from("report_photos").insert({
      report_id: report.id,
      storage_path: storagePath,
      public_url: publicUrl,
      photo_type: "original",
    });

    // ── Insert initial status history ──
    await supabase.from("status_history").insert({
      report_id: report.id,
      from_status: null,
      to_status: "reported",
      changed_by: "system",
    });

    // ── Opt-in status notifications (PRD §6.5) ──
    // Written only when the user actually supplied an address. There is no
    // implicit subscription anywhere in this codebase.
    if (body.notify_email) {
      const { error: notifyError } = await supabase.from("user_notifications").insert({
        reporter_token: body.reporter_token,
        notification_type: "email",
        email: body.notify_email,
        report_id: report.id,
        is_active: true,
      });
      // A failed subscription must not fail the report — the citizen's primary
      // intent was to report the problem, not to sign up for email.
      if (notifyError) {
        console.error("Notification opt-in failed:", notifyError.message);
      }
    }

    // Search is served by Postgres FTS (migration 016), so there is no external
    // index to sync. The previous Elasticsearch TODO here is obsolete — see the
    // Sprint 12 delta in MASTERPLAN and OG4.

    // ── Look up council name for response ──
    let councilName = "";
    if (body.council_id) {
      const { data: council } = await supabase
        .from("councils")
        .select("name")
        .eq("id", body.council_id)
        .single();
      councilName = council?.name ?? "";
    }

    // ── Build response ──
    const response: Record<string, unknown> = {
      report_id: report.id,
      address: body.address ?? "",
      suburb: body.suburb ?? "",
      council_name: councilName,
      map_pin: {
        id: report.id,
        lat: report.lat,
        lng: report.lng,
        category: report.category,
        status: report.status,
        upvote_count: report.upvote_count,
        priority_score: report.priority_score,
        address: report.address,
        suburb: report.suburb,
        submitted_at: report.submitted_at,
      },
    };

    // Add duplicate info if found
    if (duplicates && duplicates.length > 0) {
      const dup = duplicates[0];
      response.duplicate_nearby = {
        report_id: dup.id,
        upvote_count: dup.upvote_count,
        address: dup.address,
      };
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Unexpected error:", err);
    return errorResponse(500, "Internal server error");
  }
});

function errorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
