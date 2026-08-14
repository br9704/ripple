-- ============================================================
-- 014 — Enable Realtime on reports
--
-- Fixes MASTERPLAN S2.15 (discovered Aug 2026).
--
-- src/hooks/useReports.ts subscribes to postgres_changes on `reports` and has
-- done since Sprint 6. Nothing ever enabled the underlying publication, so the
-- channel connected successfully and then received nothing — a silent failure,
-- which is why it survived a sprint marked complete. The live map has never
-- actually been live.
--
-- REPLICA IDENTITY FULL is required for DELETE events: without it Postgres only
-- emits the primary key in `old`, and useReports.ts:71 reads payload.old.id.
-- FULL also makes UPDATE payloads carry previous values, which Sprint 8 needs to
-- diff upvote_count.
-- ============================================================

-- Add the table to the Realtime publication, tolerating re-runs.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  END IF;
END
$$;

ALTER TABLE public.reports REPLICA IDENTITY FULL;
