// Supabase Edge Function: submit-report
// Validates, uploads photo to Storage, inserts report + photo record.
// Source: PRD Section 9.1

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.220.0/encoding/base64.ts";

const VALID_CATEGORIES = [
  "pothole", "streetlight", "graffiti", "signage",
  "accessibility", "dumping", "water", "tree", "footpath", "other",
] as const;

interface SubmitReportBody {
  category: string;
  ai_category: string;
  ai_confidence: number;
  user_corrected_ai: boolean;
  lat: number;
  lng: number;
  address?: string | null;
  suburb?: string | null;
  postcode?: string | null;
  council_id?: string | null;
  note?: string;
  reporter_token: string;
  photo_base64: string;
  additional_photos?: string[];
}

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
    const body: SubmitReportBody = await req.json();

    // ── Validation ──
    if (!body.category || !VALID_CATEGORIES.includes(body.category as typeof VALID_CATEGORIES[number])) {
      return errorResponse(400, "Invalid or missing category");
    }
    if (typeof body.lat !== "number" || typeof body.lng !== "number") {
      return errorResponse(400, "Invalid or missing coordinates");
    }
    if (body.lat < -90 || body.lat > 90 || body.lng < -180 || body.lng > 180) {
      return errorResponse(400, "Coordinates out of valid range");
    }
    if (!body.reporter_token) {
      return errorResponse(400, "Missing reporter_token");
    }
    if (!body.photo_base64) {
      return errorResponse(400, "Missing photo");
    }
    if (body.note && body.note.length > 140) {
      return errorResponse(400, "Note exceeds 140 character limit");
    }

    // ── Supabase admin client (service role) ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    // TODO: Sprint 12 — Elasticsearch sync (async, non-blocking)

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
