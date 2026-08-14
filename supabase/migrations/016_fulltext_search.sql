-- ============================================================
-- 016 — Full-text search over reports (Postgres, not Elasticsearch)
--
-- MASTERPLAN Sprint 12 specified Elasticsearch. This implements the same user-
-- facing capability on Postgres instead, for reasons recorded in OG4:
--
--   * Elastic Cloud is ~$16/month for a product with no live users, and the
--     sprint would add an entire second datastore to keep in sync — including
--     the sync Edge Function, a nightly full re-index, and a proxy to keep the
--     client away from ES.
--   * PRD Q5 already flags Typesense/Meilisearch as cheaper candidates, so the
--     choice was never settled.
--   * Postgres FTS covers use case 1 (full-text over address and note) and,
--     with the existing indexes, the category/status/geo filters too. What it
--     does not cover well is use cases 2-4 — the aggregation-heavy council
--     analytics — which do not exist until Phase 3.
--
-- This is deliberately NOT a decision to never use Elasticsearch. It is a
-- decision not to pay for it before there is a single user, and to keep the
-- search *interface* (useSearch) stable so the backend can be swapped without
-- touching the UI. Spending money is Bruno's call — see OG4.
--
-- The search vector is generated rather than trigger-maintained: a GENERATED
-- column cannot drift from its source data, which a trigger can if an UPDATE
-- ever bypasses it.
-- ============================================================

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(address, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(suburb,  '')), 'A') ||
    setweight(to_tsvector('english', coalesce(note,    '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_reports_search ON reports USING GIN(search_vector);

-- ============================================================
-- search_reports — the query surface the client calls.
--
-- SECURITY INVOKER so RLS still applies: this must not become a way to read
-- rows the caller could not otherwise select.
-- ============================================================
CREATE OR REPLACE FUNCTION search_reports(
  p_query       TEXT DEFAULT NULL,
  p_categories  TEXT[] DEFAULT NULL,
  p_statuses    TEXT[] DEFAULT NULL,
  p_suburb      TEXT DEFAULT NULL,
  p_min_upvotes INTEGER DEFAULT 0,
  p_date_from   TIMESTAMPTZ DEFAULT NULL,
  p_sort        TEXT DEFAULT 'relevance',
  p_limit       INTEGER DEFAULT 20,
  p_offset      INTEGER DEFAULT 0
)
RETURNS TABLE (
  id             UUID,
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  category       TEXT,
  status         TEXT,
  upvote_count   INTEGER,
  priority_score NUMERIC,
  address        TEXT,
  suburb         TEXT,
  submitted_at   TIMESTAMPTZ,
  rank           REAL,
  total_count    BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH q AS (
    SELECT CASE
      WHEN p_query IS NULL OR btrim(p_query) = '' THEN NULL
      -- websearch_to_tsquery tolerates whatever a human types: unbalanced
      -- quotes, stray operators, "pothole -fixed". plainto_ would reject some
      -- of it and to_tsquery would raise.
      ELSE websearch_to_tsquery('english', p_query)
    END AS tsq
  ),
  matched AS (
    SELECT r.*,
           CASE WHEN (SELECT tsq FROM q) IS NULL
                THEN 0::real
                ELSE ts_rank(r.search_vector, (SELECT tsq FROM q))
           END AS rank
    FROM reports r
    WHERE ((SELECT tsq FROM q) IS NULL OR r.search_vector @@ (SELECT tsq FROM q))
      AND (p_categories IS NULL OR cardinality(p_categories) = 0 OR r.category = ANY(p_categories))
      AND (p_statuses   IS NULL OR cardinality(p_statuses)   = 0 OR r.status   = ANY(p_statuses))
      AND (p_suburb     IS NULL OR r.suburb ILIKE p_suburb)
      AND (p_min_upvotes <= 0 OR r.upvote_count >= p_min_upvotes)
      AND (p_date_from  IS NULL OR r.submitted_at >= p_date_from)
  )
  SELECT m.id, m.lat, m.lng, m.category, m.status, m.upvote_count, m.priority_score,
         m.address, m.suburb, m.submitted_at, m.rank,
         COUNT(*) OVER () AS total_count
  FROM matched m
  ORDER BY
    CASE WHEN p_sort = 'relevance' THEN m.rank END DESC NULLS LAST,
    CASE WHEN p_sort = 'upvotes'   THEN m.upvote_count END DESC NULLS LAST,
    CASE WHEN p_sort = 'priority'  THEN m.priority_score END DESC NULLS LAST,
    CASE WHEN p_sort = 'newest'    THEN m.submitted_at END DESC NULLS LAST,
    -- Total ordering: without a final tiebreak, LIMIT/OFFSET paging can repeat
    -- or skip rows between pages when sort keys tie.
    m.submitted_at DESC,
    m.id
  -- Hard ceiling: a caller cannot request an unbounded page.
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

COMMENT ON FUNCTION search_reports IS
  'Full-text + filtered search over reports. SECURITY INVOKER so RLS applies. Returns total_count via a window function so the caller can page without a second query.';
