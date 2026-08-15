-- ============================================================
-- 025 — Stop handing out reporter_token (column privileges)
--
-- Migration 015 scoped anonymous writes to the caller's own `reporter_token`
-- and closed with this sentence:
--
--     "So we also stop handing the tokens out."
--
-- That claim was false, and this migration is the retraction.
--
-- 015 removed the *upvotes* SELECT policy that published tokens. It did not
-- remove the other four places the same value is published, because RLS is
-- row-level and every one of those tables is meant to be world-readable:
--
--   reports.reporter_token         reports_select_all        USING (true)
--   comments.reporter_token        comments_select_all       USING (true)
--   report_photos.uploaded_by_token report_photos_select_all USING (true)
--   badges_earned.reporter_token   badges_earned_select_all  USING (true)
--
-- The last two were not in the original report. `uploaded_by_token` (019) and
-- `badges_earned.reporter_token` (009) hold exactly the same values as
-- `reports.reporter_token` — the confirm-fix function writes the caller's
-- reporter token into one and the 021 badge trigger copies it into the other —
-- so plugging only `reports` and `comments` would have left two open taps.
--
-- The proven chain, executed as `anon` against a local Postgres 17 running
-- every migration, with nothing but the public anon key:
--
--   1. SELECT reporter_token FROM reports          -- harvest a victim's token
--   2. SET request.headers = '{"x-reporter-token":"<harvested>"}'
--   3. SELECT email FROM user_notifications        -- victim's email address
--   4. DELETE FROM upvotes                         -- victim's upvote destroyed
--
-- Steps 2–4 are the behaviour 015 accepted as residual risk ("a caller who
-- already knows a specific victim's token can still spoof that header"). The
-- whole reason that was acceptable was the assumption that tokens are hard to
-- come by. Step 1 made them free. Every guarantee 015 claims is therefore
-- bypassable, and the fix belongs at step 1.
--
-- ── Why column privileges and not another RLS policy ─────────
--
-- There is no row-level answer. The rows *must* stay public: the map, the
-- detail page and the comment thread are the product. What must not be public
-- is one column of them. Postgres has exactly one mechanism for that, and it
-- is GRANT/REVOKE at column granularity.
--
-- ── Why REVOKE SELECT(col) alone does not work ───────────────
--
-- The obvious spelling is a no-op. Measured on Postgres 17.11:
--
--     GRANT SELECT ON t TO anon;              -- table-level
--     REVOKE SELECT (secret) ON t FROM anon;  -- silently changes nothing
--     SET ROLE anon; SELECT secret FROM t;    -- still returns the secret
--
-- A table-level SELECT privilege authorises every column, and a column-level
-- REVOKE cannot subtract from it — the two live in different ACLs
-- (pg_class.relacl vs pg_attribute.attacl) and the table-level check short-
-- circuits the per-column one. The only spelling that works is to drop the
-- table-level grant entirely and re-grant the columns that stay public:
--
--     REVOKE SELECT ON t FROM anon, authenticated;
--     GRANT  SELECT (every_column_except_the_token) ON t TO anon, authenticated;
--
-- That is what restrict_public_columns() below does, computing the column list
-- from the catalogue rather than from a hand-typed list that would silently
-- drift the first time someone adds a column.
--
-- ── Consequence: this is fail-closed, and that cuts both ways ─
--
-- With no table-level grant left, a column added to one of these four tables by
-- a LATER migration is invisible to anon until it is granted. That is the safe
-- direction to fail, but it is a real maintenance obligation:
--
--     any migration that adds a column to reports, comments, report_photos or
--     badges_earned must end with a call to public.restrict_public_columns().
--
-- supabase/test/02_rls.sql asserts both halves — the token is unreadable AND
-- every other column still is — so a forgotten re-grant fails the build rather
-- than shipping a blank field to users.
--
-- ── What breaks, and what replaces it ────────────────────────
--
-- In Postgres, naming a column in WHERE needs SELECT on that column just as
-- much as naming it in the select list. Three client call sites did exactly
-- that and are replaced by the three functions below:
--
--   MyReportsPage    .eq('reporter_token', myToken)      → my_reports()
--   ReportDetailPage report.reporter_token === myToken   → is_my_report(id)
--   CommentThread    c.reporter_token === myToken        → report_comments(id)
--
-- ── Why RPCs and not PostgREST computed columns ──────────────
--
-- A computed column (`CREATE FUNCTION is_mine(reports) RETURNS boolean`) is the
-- more idiomatic PostgREST shape and was the first choice. It cannot work here.
-- A whole-row reference — which is what passing `reports` to a function is —
-- requires SELECT on the *whole table*, not on the columns the function body
-- happens to touch. Measured, same database:
--
--     SET ROLE anon; SELECT is_mine(t) FROM t;
--     ERROR:  permission denied for table t
--
-- SECURITY DEFINER does not rescue it either: the whole-row Var is resolved in
-- the caller's context before the function is ever entered, so the definer's
-- privileges arrive too late. Both variants were tested and both fail. The
-- computed-column pattern and withheld columns are mutually exclusive, and
-- withholding the column is the requirement. So: scalar-argument RPCs.
--
-- ── Threat model, stated honestly ────────────────────────────
--
--   * This closes token harvesting through PostgREST for anon and for
--     authenticated (council coordinators). No client role can read the column
--     from any of the four tables, in a select list, a filter, or an ORDER BY.
--   * It does NOT make the token a secret in the cryptographic sense. It still
--     travels in a request header on every call, it still sits in localStorage,
--     and anyone who can read a user's browser storage or intercept their
--     traffic has it. That is inherent to identifying an anonymous device with
--     a bearer value, and the PRD §6.1 no-account requirement chooses it
--     knowingly.
--   * It does NOT fix the underlying design: a caller who obtains a token by
--     any other route can still spoof the header and act as that user. 015 was
--     right that closing that needs real auth. This migration removes the free
--     supply, which is what made the attack practical.
--   * Realtime is a separate surface. supabase/realtime builds change payloads
--     from the WAL, not from a PostgREST query, and this migration does not
--     verify what it does with a withheld column. The clients here read only
--     the columns they declare (see src/hooks/useReports.ts), so nothing in
--     this app surfaces a token from a Realtime payload — but a future
--     subscriber that spreads the raw payload could. Treat Realtime payloads on
--     these tables as untrusted-wide until someone measures it.
--   * The service role is unaffected by design. REVOKE below names only anon
--     and authenticated, so submit-report, update-status, confirm-fix and
--     send-notification — all of which construct their client with
--     SUPABASE_SERVICE_ROLE_KEY — keep full column access. So do the SECURITY
--     DEFINER triggers (award_badges, award_fix_badge, set_report_city) and the
--     leaderboard() join, none of which run as a client role.
-- ============================================================

-- ── The mechanism ────────────────────────────────────────────
-- Replaces the table-level SELECT grant with a column-level one covering
-- everything except p_withhold. Derives the column list from pg_attribute at
-- call time so it stays correct as tables gain columns, and so the withheld
-- set is the only thing anyone has to think about.
CREATE OR REPLACE FUNCTION public.restrict_public_columns(
  p_table    REGCLASS,
  p_withhold TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_columns TEXT;
BEGIN
  SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum)
    INTO v_columns
    FROM pg_attribute a
   WHERE a.attrelid = p_table
     AND a.attnum > 0
     AND NOT a.attisdropped
     AND NOT (a.attname = ANY (p_withhold));

  IF v_columns IS NULL THEN
    RAISE EXCEPTION 'restrict_public_columns: % has no public columns left', p_table;
  END IF;

  -- Order matters. The GRANT must not run first: a column-level grant is
  -- invisible while a table-level one is still in place.
  EXECUTE format('REVOKE SELECT ON %s FROM anon, authenticated', p_table::TEXT);
  EXECUTE format('GRANT SELECT (%s) ON %s TO anon, authenticated', v_columns, p_table::TEXT);
END;
$$;

-- Not a client-callable API. It would be harmless if it were — it is SECURITY
-- INVOKER, so a caller who does not own the table changes nothing — but a
-- function whose whole job is rewriting grants has no business being reachable
-- from the public anon key.
REVOKE EXECUTE ON FUNCTION public.restrict_public_columns(REGCLASS, TEXT[]) FROM PUBLIC;

SELECT public.restrict_public_columns('public.reports',       ARRAY['reporter_token']);
SELECT public.restrict_public_columns('public.comments',      ARRAY['reporter_token']);
SELECT public.restrict_public_columns('public.badges_earned', ARRAY['reporter_token']);
SELECT public.restrict_public_columns('public.report_photos', ARRAY['uploaded_by_token']);

-- `upvotes` and `user_notifications` keep their table-level grant on purpose:
-- migration 015 already scopes their SELECT to the caller's own rows, so the
-- token they expose is one the caller supplied in the first place. Revoking
-- there would break the "have I upvoted this?" check for no gain.

-- ── Replacement APIs ─────────────────────────────────────────

-- The reporter's own submissions (PRD §12.1), previously
-- `.eq('reporter_token', …)` from the browser.
--
-- SECURITY DEFINER because it reads the withheld column. The escalation is
-- bounded to one predicate that the caller cannot influence: the token comes
-- from the request header, never from an argument, so there is no shape of call
-- that returns another caller's rows. A missing header returns zero rows rather
-- than every row — the NULL guard is the difference between this and an
-- accidental full dump.
CREATE OR REPLACE FUNCTION my_reports(p_limit INTEGER DEFAULT 200)
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
  city_id        UUID,
  submitted_at   TIMESTAMPTZ,
  photo_url      TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.id, r.lat, r.lng, r.category, r.status, r.upvote_count,
         r.priority_score, r.address, r.suburb, r.city_id, r.submitted_at,
         ph.public_url
  FROM reports r
  -- Flattened here rather than left to a PostgREST embed: the client used to
  -- join report_photos and pick the original in JavaScript, and one row per
  -- report is the shape the feed actually renders.
  LEFT JOIN LATERAL (
    SELECT p.public_url
    FROM report_photos p
    WHERE p.report_id = r.id
    ORDER BY (p.photo_type = 'original') DESC, p.uploaded_at
    LIMIT 1
  ) ph ON TRUE
  -- Wrapped in a scalar sub-select so the planner evaluates the header once as
  -- an InitPlan. current_reporter_token() is STABLE, not IMMUTABLE, so a bare
  -- call in the qual is re-evaluated per row against an unindexed column.
  WHERE (SELECT public.current_reporter_token()) IS NOT NULL
    AND r.reporter_token = (SELECT public.current_reporter_token())
  ORDER BY r.submitted_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 200), 1), 500);
$$;

-- "Is this mine?" for the fix-confirmation control on the detail page.
--
-- Returns a boolean and nothing else. It is an oracle only over reports the
-- caller's own token already owns: the comparison is always against the header
-- token, so probing report ids reveals only which of them the caller submitted.
CREATE OR REPLACE FUNCTION is_my_report(p_report_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_reporter_token() IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM reports r
       WHERE r.id = p_report_id
         AND r.reporter_token = public.current_reporter_token()
     );
$$;

-- The comment thread, with authorship reduced to a boolean.
--
-- `is_mine` is the only thing the UI ever did with comments.reporter_token — it
-- renders "you" or "neighbour" and hides the flag button on your own comment.
-- Computing it server-side means the token never crosses the wire, and the
-- client cannot mislabel a comment even if it wanted to.
--
-- `hidden = FALSE` stays in the query rather than in the UI: a moderated
-- comment must not reach the client at all (migration 018).
CREATE OR REPLACE FUNCTION report_comments(p_report_id UUID)
RETURNS TABLE (
  id         UUID,
  report_id  UUID,
  is_council BOOLEAN,
  is_pinned  BOOLEAN,
  body       TEXT,
  flag_count INTEGER,
  hidden     BOOLEAN,
  created_at TIMESTAMPTZ,
  is_mine    BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.report_id, c.is_council, c.is_pinned, c.body,
         c.flag_count, c.hidden, c.created_at,
         -- NULL header (no token) must read as "not mine", not as NULL: the
         -- client uses this to decide whether to offer a flag button.
         -- Scalar sub-select so the header is parsed once, not once per comment.
         COALESCE(c.reporter_token = (SELECT public.current_reporter_token()), FALSE)
  FROM comments c
  WHERE c.report_id = p_report_id
    AND c.hidden = FALSE
  -- Council pins first, then oldest to newest — a thread reads forwards.
  ORDER BY c.is_pinned DESC, c.created_at;
$$;

GRANT EXECUTE ON FUNCTION my_reports(INTEGER)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION is_my_report(UUID)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION report_comments(UUID)   TO anon, authenticated;

-- ── Self-check ───────────────────────────────────────────────
-- The failure mode this migration exists to prevent is a grant that looks
-- applied and is not — which is precisely what the naive
-- `REVOKE SELECT (reporter_token)` spelling does. Assert the outcome rather
-- than trusting the statements above ran as intended.
DO $$
DECLARE
  v_table TEXT;
  v_col   TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    RAISE NOTICE '025: role anon absent, skipping self-check';
    RETURN;
  END IF;

  FOR v_table, v_col IN
    SELECT * FROM (VALUES
      ('reports',       'reporter_token'),
      ('comments',      'reporter_token'),
      ('badges_earned', 'reporter_token'),
      ('report_photos', 'uploaded_by_token')
    ) AS t(tbl, col)
  LOOP
    IF has_column_privilege('anon', v_table, v_col, 'SELECT') THEN
      RAISE EXCEPTION '025 FAILED: anon can still SELECT %.% — tokens are still harvestable', v_table, v_col;
    END IF;
    IF has_column_privilege('authenticated', v_table, v_col, 'SELECT') THEN
      RAISE EXCEPTION '025 FAILED: authenticated can still SELECT %.%', v_table, v_col;
    END IF;
    -- And the tables must not have been locked shut by accident.
    IF NOT has_column_privilege('anon', v_table, 'id', 'SELECT') THEN
      RAISE EXCEPTION '025 FAILED: anon lost SELECT on %.id — the app would be blank', v_table;
    END IF;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.restrict_public_columns(REGCLASS, TEXT[]) IS
  'Swaps a table-level SELECT grant for a column-level one that omits p_withhold. A column-level REVOKE cannot subtract from a table-level GRANT, so dropping the table grant first is the only spelling that works. Any migration adding a column to reports, comments, report_photos or badges_earned must call this again — the new column is invisible to anon until it does.';

COMMENT ON FUNCTION my_reports(INTEGER) IS
  'The caller''s own reports, keyed on the x-reporter-token header. Replaces a client-side .eq(reporter_token, …), which stopped being possible once anon lost SELECT on that column. Returns nothing when the header is absent.';

COMMENT ON FUNCTION is_my_report(UUID) IS
  'Whether the given report belongs to the calling token. Returns a boolean so the client never needs the token itself to decide whether to offer fix confirmation.';

COMMENT ON FUNCTION report_comments(UUID) IS
  'Visible comments for a report with authorship collapsed to is_mine. comments.reporter_token is never returned; publishing it let anyone harvest a token and then spoof the x-reporter-token header (migration 025).';

COMMENT ON COLUMN reports.reporter_token IS
  'Anonymous device identifier, and the credential every anonymous-write policy checks. Not readable by anon or authenticated (migration 025) — reading it out of a public SELECT was enough to impersonate any reporter.';

COMMENT ON COLUMN comments.reporter_token IS
  'Comment authorship. Not readable by anon or authenticated (migration 025); use report_comments() for the is_mine boolean.';

COMMENT ON COLUMN badges_earned.reporter_token IS
  'Holds the same value as reports.reporter_token, so publishing it was a second route to the same impersonation. Not readable by anon or authenticated (migration 025).';

COMMENT ON COLUMN report_photos.uploaded_by_token IS
  'The reporter_token that uploaded a confirmation photo. Same credential, same exposure — not readable by anon or authenticated (migration 025).';
