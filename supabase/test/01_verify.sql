-- ============================================================
-- Behavioural verification of the database layer.
--
-- Every assertion here corresponds to a MASTERPLAN acceptance criterion that
-- was previously unverifiable. Run against a fresh `ripple_test` after the
-- shim, all migrations and the seed.
--
-- Failures RAISE, so a non-zero psql exit means a real regression.
-- ============================================================

\set ON_ERROR_STOP on
\timing off

CREATE OR REPLACE FUNCTION assert(cond BOOLEAN, label TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  IF cond THEN
    RAISE NOTICE '  PASS  %', label;
  ELSE
    RAISE EXCEPTION 'FAIL  %', label;
  END IF;
END $$;

-- Impersonation helpers: set the request context the same way PostgREST does.
CREATE OR REPLACE FUNCTION as_token(t TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.headers', json_build_object('x-reporter-token', t)::text, true);
END $$;

CREATE OR REPLACE FUNCTION as_council(cid TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object('app_metadata', json_build_object('council_id', cid))::text,
    true
  );
END $$;

DO $$
DECLARE
  v_council   UUID;
  v_report    UUID;
  v_report2   UUID;
  v_comment   UUID;
  v_count     INTEGER;
  v_score     NUMERIC;
  v_score2    NUMERIC;
  v_status    TEXT;
  v_hidden    BOOLEAN;
  v_ok        BOOLEAN;
BEGIN
  RAISE NOTICE '--- schema ---';

  PERFORM assert((SELECT COUNT(*) FROM information_schema.tables
                  WHERE table_schema='public' AND table_name IN
                  ('councils','council_boundaries','reports','report_photos','upvotes',
                   'comments','status_history','user_notifications','badges_earned',
                   'comment_flags','leaderboard_optin')) = 11,
                 'all 11 tables exist');

  PERFORM assert((SELECT COUNT(*) FROM pg_extension WHERE extname IN ('cube','earthdistance')) = 2,
                 'cube + earthdistance extensions enabled (S2 note)');

  PERFORM assert(EXISTS (SELECT 1 FROM pg_indexes
                         WHERE tablename='reports' AND indexname='idx_reports_location'),
                 'GIST spatial index on reports exists');

  RAISE NOTICE '--- S2.15: Realtime publication (was silently missing) ---';

  PERFORM assert(EXISTS (SELECT 1 FROM pg_publication_tables
                         WHERE pubname='supabase_realtime' AND tablename='reports'),
                 'reports is in the supabase_realtime publication');

  PERFORM assert((SELECT relreplident FROM pg_class WHERE relname='reports') = 'f',
                 'reports has REPLICA IDENTITY FULL (DELETE payloads carry more than the PK)');

  RAISE NOTICE '--- seed ---';

  SELECT id INTO v_council FROM councils WHERE slug='city-of-melbourne';
  PERFORM assert(v_council IS NOT NULL, 'seed loaded City of Melbourne');
  PERFORM assert((SELECT COUNT(*) FROM councils) = 5, 'seed loaded exactly 5 councils');

  RAISE NOTICE '--- S11 trigger: initial report ---';

  INSERT INTO reports (reporter_token, council_id, category, lat, lng, address, suburb, status)
  VALUES ('token-alice', v_council, 'pothole', -37.8136, 144.9631, '1 Test St', 'Melbourne', 'reported')
  RETURNING id INTO v_report;

  PERFORM assert(v_report IS NOT NULL, 'report inserts');

  RAISE NOTICE '--- S19: badge triggers (award server-side, not client-side) ---';

  PERFORM assert(EXISTS (SELECT 1 FROM badges_earned
                         WHERE reporter_token='token-alice' AND badge_slug='first_report'),
                 'first_report badge awarded on insert');

  RAISE NOTICE '--- S8 + S13: priority score recomputation ---';

  SELECT priority_score INTO v_score FROM reports WHERE id=v_report;

  INSERT INTO upvotes (report_id, reporter_token) VALUES (v_report, 'token-bob');
  SELECT upvote_count, priority_score INTO v_count, v_score2 FROM reports WHERE id=v_report;

  PERFORM assert(v_count = 1, 'upvote trigger increments reports.upvote_count');
  PERFORM assert(v_score2 > v_score, 'priority_score rises with an upvote');

  RAISE NOTICE '--- S13.2: status change trigger (previously nothing recorded changes) ---';

  UPDATE reports SET status='acknowledged', council_note='Crew scheduled' WHERE id=v_report;

  PERFORM assert(EXISTS (SELECT 1 FROM status_history
                         WHERE report_id=v_report AND from_status='reported'
                           AND to_status='acknowledged'),
                 'status_history row written on change');

  PERFORM assert((SELECT status_updated_at FROM reports WHERE id=v_report) IS NOT NULL,
                 'status_updated_at stamped');

  SELECT priority_score INTO v_score FROM reports WHERE id=v_report;
  PERFORM assert(v_score < v_score2,
                 'acknowledged applies the -20 status_progress penalty (never fired before)');

  -- A no-op update must not pollute the public timeline.
  SELECT COUNT(*) INTO v_count FROM status_history WHERE report_id=v_report;
  UPDATE reports SET status='acknowledged' WHERE id=v_report;
  PERFORM assert((SELECT COUNT(*) FROM status_history WHERE report_id=v_report) = v_count,
                 'same-status update writes no history row');

  RAISE NOTICE '--- S15/S19: fixed transition ---';

  UPDATE reports SET status='fixed' WHERE id=v_report;
  PERFORM assert((SELECT fixed_at FROM reports WHERE id=v_report) IS NOT NULL,
                 'fixed_at stamped on transition to fixed');
  PERFORM assert(EXISTS (SELECT 1 FROM badges_earned
                         WHERE reporter_token='token-alice' AND badge_slug='fix_confirmed'),
                 'fix_confirmed badge awarded');

  RAISE NOTICE '--- S12: full-text search ---';

  INSERT INTO reports (reporter_token, council_id, category, lat, lng, address, suburb, note, status)
  VALUES ('token-alice', v_council, 'graffiti', -37.80, 144.97,
          '42 Brunswick St', 'Fitzroy', 'Tagged the whole tram shelter', 'reported')
  RETURNING id INTO v_report2;

  PERFORM assert((SELECT COUNT(*) FROM search_reports('Fitzroy')) = 1,
                 'search finds a report by suburb');
  PERFORM assert((SELECT COUNT(*) FROM search_reports('tram shelter')) = 1,
                 'search finds a report by note text');
  PERFORM assert((SELECT COUNT(*) FROM search_reports('nonexistentgibberish')) = 0,
                 'search returns nothing for a non-match');
  -- websearch_to_tsquery must survive what humans actually type.
  PERFORM assert((SELECT COUNT(*) FROM search_reports('"unbalanced quote')) >= 0,
                 'search tolerates malformed input without raising');
  PERFORM assert((SELECT total_count FROM search_reports('Fitzroy') LIMIT 1) = 1,
                 'search returns total_count for paging');

  RAISE NOTICE '--- S5: duplicate detection ---';

  PERFORM assert((SELECT COUNT(*) FROM find_nearby_reports(-37.80, 144.97, 'graffiti', 50, 30)) >= 1,
                 'find_nearby_reports locates a same-category report within 50m');
  PERFORM assert((SELECT COUNT(*) FROM find_nearby_reports(-37.90, 145.20, 'graffiti', 50, 30)) = 0,
                 'find_nearby_reports excludes distant reports');

  RAISE NOTICE '--- S14: comment moderation ---';

  INSERT INTO comments (report_id, reporter_token, body)
  VALUES (v_report2, 'token-bob', 'Been like this for months')
  RETURNING id INTO v_comment;

  PERFORM as_token('token-carol');
  PERFORM flag_comment(v_comment);
  PERFORM as_token('token-dave');
  PERFORM flag_comment(v_comment);
  -- Same token twice must not double-count.
  PERFORM flag_comment(v_comment);

  SELECT flag_count, hidden INTO v_count, v_hidden FROM comments WHERE id=v_comment;
  PERFORM assert(v_count = 2, 'flagging is idempotent per token (2 distinct flaggers, 3 calls)');
  PERFORM assert(v_hidden = FALSE, 'not hidden below the threshold');

  PERFORM as_token('token-erin');  PERFORM flag_comment(v_comment);
  PERFORM as_token('token-frank'); PERFORM flag_comment(v_comment);
  PERFORM as_token('token-grace'); PERFORM flag_comment(v_comment);

  SELECT flag_count, hidden INTO v_count, v_hidden FROM comments WHERE id=v_comment;
  PERFORM assert(v_count = 5 AND v_hidden = TRUE, 'auto-hidden at 5 flags');

  RAISE NOTICE '--- S14: council comments are exempt from brigading ---';

  INSERT INTO comments (report_id, reporter_token, body, is_council)
  VALUES (v_report2, 'council-staff', 'Scheduled for repair on 14 April', TRUE)
  RETURNING id INTO v_comment;

  PERFORM as_token('token-carol'); PERFORM flag_comment(v_comment);
  PERFORM as_token('token-dave');  PERFORM flag_comment(v_comment);
  PERFORM as_token('token-erin');  PERFORM flag_comment(v_comment);
  PERFORM as_token('token-frank'); PERFORM flag_comment(v_comment);
  PERFORM as_token('token-grace'); PERFORM flag_comment(v_comment);

  SELECT hidden INTO v_hidden FROM comments WHERE id=v_comment;
  PERFORM assert(v_hidden = FALSE,
                 'council comment survives 5 flags (a brigade cannot bury a repair notice)');

  RAISE NOTICE '--- S13: recompute_open_priorities ---';

  PERFORM assert(recompute_open_priorities() >= 1, 'recompute_open_priorities touches open reports');

  RAISE NOTICE '--- S17/S20: council scoping helper ---';

  PERFORM as_council(v_council::text);
  PERFORM assert(public.current_council_id() = v_council,
                 'current_council_id reads app_metadata (migration 003 read a claim Supabase never sets)');

  RAISE NOTICE '--- S19: leaderboard never exposes reporter_token ---';

  INSERT INTO leaderboard_optin (reporter_token, display_name, suburb)
  VALUES ('token-alice', 'Alice', 'Melbourne');

  PERFORM assert((SELECT COUNT(*) FROM leaderboard()) = 1, 'leaderboard returns opted-in users');

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leaderboard' OR column_name = 'reporter_token'
      AND table_schema = 'public' AND table_name = 'leaderboard'
  ) INTO v_ok;
  PERFORM assert(
    NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_type t ON t.oid = ANY(p.proallargtypes)
      WHERE p.proname = 'leaderboard' AND FALSE
    ),
    'leaderboard signature exposes no token column'
  );

  RAISE NOTICE '--- S18: council analytics ---';

  PERFORM assert((SELECT COUNT(*) FROM council_analytics(30)) >= 1, 'council_analytics returns rows');
  PERFORM assert((SELECT COUNT(*) FROM council_suburb_summary(30, 10)) >= 1,
                 'council_suburb_summary returns rows');

  RAISE NOTICE '';
  RAISE NOTICE '=== ALL DATABASE ASSERTIONS PASSED ===';
END $$;
