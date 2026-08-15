-- ============================================================
-- 027 — Weekly council summary (S21.3)
--
-- Source: PRD §5.4, a named Phase 3 end-state deliverable — "Full council
-- dashboard, priority scoring algorithm, weekly auto-generated summary
-- reports, CSV export, batch status updates, council boundary management."
-- Everything in that sentence shipped except the summary reports.
--
-- ── Why a summary is not the dashboard ──
-- The dashboard answers "what is happening right now" and requires the
-- coordinator to open it. PRD §4 has that coordinator receiving reports by
-- phone, email, portal and councillor forwards — a person whose inbox is the
-- system of record. A weekly digest meets them there. The dashboard is pull;
-- this is push, and push is what makes a B2G product get looked at on a
-- Monday.
--
-- ── What is measured, and what is deliberately not ──
-- Resolution time uses the MEDIAN, not the mean. One report that sat open for
-- eight months drags a mean far enough to make a good week look bad, and a
-- council that stops trusting the number stops reading the email. The median
-- also cannot be gamed by closing a batch of trivial reports.
--
-- Percentage changes are omitted when the prior week had fewer than five
-- reports. "Reports up 300%" from one to four is noise rendered as a headline,
-- and the honesty rule that governs this repo's prose applies just as much to
-- a number a machine generates as to one a human writes.
-- ============================================================

CREATE OR REPLACE FUNCTION council_weekly_summary(
  p_council_id UUID DEFAULT NULL,
  p_week_start DATE DEFAULT NULL
)
RETURNS TABLE (
  council_id            UUID,
  council_name          TEXT,
  week_start            DATE,
  week_end              DATE,
  new_reports           BIGINT,
  acknowledged          BIGINT,
  resolved              BIGINT,
  still_open            BIGINT,
  median_days_to_fix    NUMERIC,
  top_category          TEXT,
  top_category_count    BIGINT,
  top_suburb            TEXT,
  top_suburb_count      BIGINT,
  prior_week_reports    BIGINT,
  -- NULL rather than a number when the prior week is too small to compare.
  pct_change            NUMERIC
)
LANGUAGE sql
STABLE
-- SECURITY INVOKER so RLS still applies: a coordinator calling this directly
-- must not be able to read another council's week. The digest job runs as the
-- service role, which bypasses RLS by design, so one function serves both the
-- authenticated dashboard and the unattended cron.
SECURITY INVOKER
AS $$
  WITH bounds AS (
    SELECT
      COALESCE(p_week_start, (date_trunc('week', NOW() - INTERVAL '1 week'))::DATE) AS ws
  ),
  win AS (
    SELECT ws, (ws + 7)::DATE AS we, (ws - 7)::DATE AS pws FROM bounds
  ),
  scope AS (
    SELECT c.id, c.name
    FROM councils c
    WHERE p_council_id IS NULL OR c.id = p_council_id
  ),
  this_week AS (
    SELECT r.council_id,
           COUNT(*)                                                            AS new_reports,
           COUNT(*) FILTER (WHERE r.status = 'acknowledged')                   AS acknowledged,
           COUNT(*) FILTER (WHERE r.status = 'fixed')                          AS resolved,
           COUNT(*) FILTER (WHERE r.status NOT IN ('fixed','declined','wont_fix')) AS still_open
    FROM reports r, win
    WHERE r.submitted_at >= win.ws AND r.submitted_at < win.we
    GROUP BY r.council_id
  ),
  prior AS (
    SELECT r.council_id, COUNT(*) AS n
    FROM reports r, win
    WHERE r.submitted_at >= win.pws AND r.submitted_at < win.ws
    GROUP BY r.council_id
  ),
  -- Median over reports FIXED in the window, not reports submitted in it:
  -- a report fixed this week is this week's work no matter when it arrived,
  -- and measuring by submission date would leave the slowest cases
  -- permanently uncounted.
  fixed_times AS (
    SELECT r.council_id,
           ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (
             ORDER BY EXTRACT(EPOCH FROM (r.fixed_at - r.submitted_at)) / 86400
           )::NUMERIC, 1) AS median_days
    FROM reports r, win
    WHERE r.fixed_at >= win.ws AND r.fixed_at < win.we
    GROUP BY r.council_id
  ),
  cat AS (
    SELECT DISTINCT ON (r.council_id)
           r.council_id, r.category, COUNT(*) AS n
    FROM reports r, win
    WHERE r.submitted_at >= win.ws AND r.submitted_at < win.we
    GROUP BY r.council_id, r.category
    ORDER BY r.council_id, COUNT(*) DESC, r.category
  ),
  sub AS (
    SELECT DISTINCT ON (r.council_id)
           r.council_id, COALESCE(r.suburb,'Unknown') AS suburb, COUNT(*) AS n
    FROM reports r, win
    WHERE r.submitted_at >= win.ws AND r.submitted_at < win.we
    GROUP BY r.council_id, COALESCE(r.suburb,'Unknown')
    ORDER BY r.council_id, COUNT(*) DESC, COALESCE(r.suburb,'Unknown')
  )
  SELECT
    s.id, s.name, win.ws, win.we,
    COALESCE(t.new_reports, 0),
    COALESCE(t.acknowledged, 0),
    COALESCE(t.resolved, 0),
    COALESCE(t.still_open, 0),
    f.median_days,
    c.category, COALESCE(c.n, 0),
    sb.suburb,  COALESCE(sb.n, 0),
    COALESCE(p.n, 0),
    CASE
      WHEN COALESCE(p.n, 0) >= 5
        THEN ROUND(((COALESCE(t.new_reports,0) - p.n)::NUMERIC / p.n) * 100, 1)
      ELSE NULL
    END
  FROM scope s
  CROSS JOIN win
  LEFT JOIN this_week  t  ON t.council_id  = s.id
  LEFT JOIN prior      p  ON p.council_id  = s.id
  LEFT JOIN fixed_times f ON f.council_id  = s.id
  LEFT JOIN cat        c  ON c.council_id  = s.id
  LEFT JOIN sub        sb ON sb.council_id = s.id
  ORDER BY s.name;
$$;

COMMENT ON FUNCTION council_weekly_summary IS
  'PRD §5.4 weekly auto-generated summary. Median (not mean) days-to-fix, and pct_change is NULL below five prior-week reports rather than reporting a meaningless percentage. SECURITY INVOKER: RLS scopes a coordinator to their own council; the digest job uses the service role.';

-- ── Delivery log ─────────────────────────────────────────────
-- Without this, a retry or a double-triggered cron sends the same council the
-- same Monday email twice, and the second one costs more credibility than the
-- first one earned.
CREATE TABLE council_digest_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  council_id  UUID NOT NULL REFERENCES councils(id) ON DELETE CASCADE,
  week_start  DATE NOT NULL,
  sent_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recipients  INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT one_digest_per_council_week UNIQUE (council_id, week_start)
);

ALTER TABLE council_digest_log ENABLE ROW LEVEL SECURITY;
-- No policies: written by the digest Edge Function under the service role.
-- Nothing in the client has any reason to read it.

COMMENT ON TABLE council_digest_log IS
  'Idempotency ledger for the weekly digest. UNIQUE(council_id, week_start) is the guard: the send is attempted only if the insert succeeds, so a retried cron cannot double-send.';

-- ── Scheduling ───────────────────────────────────────────────
-- Deliberately NOT scheduled here. pg_cron must be enabled on the hosted
-- project (a dashboard action on an account this repo does not have — OG1),
-- and scheduling a job that sends real email to real councils is an outward-
-- facing side effect that is Bruno's to authorise, not this migration's to
-- assume. The statement that will do it, once OG1 and OG5 land:
--
--   SELECT cron.schedule(
--     'ripple-weekly-digest', '0 8 * * 1',
--     $$ SELECT net.http_post(
--          url     := '<project>/functions/v1/weekly-digest',
--          headers := jsonb_build_object('Authorization', 'Bearer <service_role>')
--        ); $$
--   );
--
-- Left as a comment on purpose: a commented statement is a decision recorded,
-- while an uncommented one would be a decision taken on someone else's behalf.
