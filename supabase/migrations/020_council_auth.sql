-- ============================================================
-- 020 — Council dashboard access control
--
-- MASTERPLAN S17.1/S17.3. The RLS policy in migration 003 reads:
--   auth.jwt() ->> 'council_id' = council_id::text
-- which checks a TOP-LEVEL JWT claim. Supabase does not put arbitrary values
-- there — custom claims live under app_metadata, which only the service role
-- can write. As written the policy matches nothing, so council UPDATE has never
-- worked. That is the whole of Sprint 17's data access.
-- ============================================================

CREATE OR REPLACE FUNCTION public.current_council_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    coalesce(
      auth.jwt() -> 'app_metadata' ->> 'council_id',
      -- Fall back to the top-level claim so any token minted under the old
      -- (broken) assumption keeps working rather than silently losing access.
      auth.jwt() ->> 'council_id'
    ),
    ''
  )::UUID;
$$;

DROP POLICY IF EXISTS "Council update" ON reports;
DROP POLICY IF EXISTS "reports_update_council" ON reports;

CREATE POLICY "reports_update_council" ON reports
  FOR UPDATE
  USING (council_id IS NOT NULL AND council_id = public.current_council_id())
  WITH CHECK (council_id IS NOT NULL AND council_id = public.current_council_id());

-- Council staff may pin and hide comments on their own reports.
DROP POLICY IF EXISTS "comments_update_council" ON comments;
CREATE POLICY "comments_update_council" ON comments
  FOR UPDATE
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM reports r
      WHERE r.id = comments.report_id
        AND r.council_id = public.current_council_id()
    )
  );

-- ============================================================
-- council_analytics — the dashboard's aggregate view.
--
-- SECURITY INVOKER so RLS still applies: a coordinator must not be able to read
-- another council's numbers by calling the function directly.
--
-- This is the aggregation workload Sprint 12's Elasticsearch was partly meant
-- to serve. Postgres handles it comfortably at council scale; if it stops
-- doing so, that is the evidence that reopens OG4.
-- ============================================================
CREATE OR REPLACE FUNCTION council_analytics(p_days INTEGER DEFAULT 30)
RETURNS TABLE (
  category            TEXT,
  total               BIGINT,
  open_count          BIGINT,
  fixed_count         BIGINT,
  avg_days_to_fix     NUMERIC,
  avg_upvotes         NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    r.category,
    COUNT(*)                                                      AS total,
    COUNT(*) FILTER (WHERE r.status NOT IN ('fixed','declined','wont_fix')) AS open_count,
    COUNT(*) FILTER (WHERE r.status = 'fixed')                    AS fixed_count,
    ROUND(AVG(EXTRACT(EPOCH FROM (r.fixed_at - r.submitted_at)) / 86400)
          FILTER (WHERE r.fixed_at IS NOT NULL), 1)               AS avg_days_to_fix,
    ROUND(AVG(r.upvote_count), 1)                                 AS avg_upvotes
  FROM reports r
  WHERE r.submitted_at >= NOW() - (GREATEST(COALESCE(p_days, 30), 1) || ' days')::INTERVAL
  GROUP BY r.category
  ORDER BY total DESC;
$$;

-- Top suburbs by report volume (S18.2).
CREATE OR REPLACE FUNCTION council_suburb_summary(p_days INTEGER DEFAULT 30, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (suburb TEXT, total BIGINT, unresolved BIGINT)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT
    COALESCE(r.suburb, 'Unknown') AS suburb,
    COUNT(*) AS total,
    COUNT(*) FILTER (WHERE r.status NOT IN ('fixed','declined','wont_fix')) AS unresolved
  FROM reports r
  WHERE r.submitted_at >= NOW() - (GREATEST(COALESCE(p_days, 30), 1) || ' days')::INTERVAL
  GROUP BY COALESCE(r.suburb, 'Unknown')
  ORDER BY total DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;

COMMENT ON FUNCTION public.current_council_id IS
  'Council id from app_metadata (where Supabase actually stores custom claims), falling back to the legacy top-level claim. Migration 003 checked only the top-level claim, which Supabase never populates — so council UPDATE never worked.';
