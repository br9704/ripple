-- ============================================================
-- RLS enforcement, executed as the anon role.
--
-- This is the file that proves migration 015 actually fixed something. The
-- August audit found two policies named `_own` but written `USING (true)`:
-- any anonymous caller could delete anyone's upvote, and every stored
-- notification email was world-readable with nothing but the public anon key.
--
-- Asserting that from reading SQL is not proof. These tests run as `anon` with
-- RLS enforced and try the attacks directly.
-- ============================================================

\set ON_ERROR_STOP on

-- Seed data must be created as the owner, before dropping privileges.
INSERT INTO reports (id, reporter_token, category, lat, lng, status)
VALUES ('11111111-1111-1111-1111-111111111111', 'victim-token', 'pothole', -37.81, 144.96, 'reported')
ON CONFLICT (id) DO NOTHING;

INSERT INTO upvotes (id, report_id, reporter_token)
VALUES ('22222222-2222-2222-2222-222222222222',
        '11111111-1111-1111-1111-111111111111', 'victim-token')
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_notifications (id, reporter_token, notification_type, email, is_active)
VALUES ('33333333-3333-3333-3333-333333333333', 'victim-token', 'email',
        'victim@example.com', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seeds for the migration 025 assertions: every table that used to publish a
-- reporter_token needs at least one row, or "the attacker read nothing" would
-- pass for the wrong reason.
INSERT INTO comments (id, report_id, reporter_token, body)
VALUES ('44444444-4444-4444-4444-444444444444',
        '11111111-1111-1111-1111-111111111111', 'victim-token', 'the victim speaks')
ON CONFLICT (id) DO NOTHING;

INSERT INTO report_photos (id, report_id, storage_path, public_url, photo_type, uploaded_by_token)
VALUES ('55555555-5555-5555-5555-555555555555',
        '11111111-1111-1111-1111-111111111111',
        'reports/victim.jpg', 'https://example.test/victim.jpg',
        'fixed_confirmation', 'victim-token')
ON CONFLICT (id) DO NOTHING;

INSERT INTO badges_earned (id, reporter_token, badge_slug)
VALUES ('66666666-6666-6666-6666-666666666666', 'victim-token', 'first_report')
ON CONFLICT (reporter_token, badge_slug) DO NOTHING;

-- The table owner bypasses RLS, so drop to a role that does not.
SET ROLE anon;

-- Impersonate an ATTACKER: a different anonymous device.
SELECT set_config('request.headers',
                  '{"x-reporter-token":"attacker-token"}', false) AS _;

DO $$
DECLARE
  v_visible  INTEGER;
  v_deleted  INTEGER;
  v_tbl      TEXT;
  v_col      TEXT;
  v_bool     BOOLEAN;
  v_text     TEXT;
BEGIN
  RAISE NOTICE '--- running as: % ---', current_user;

  -- ── S2.16 defect 1: anyone could delete any upvote ──
  DELETE FROM upvotes WHERE id = '22222222-2222-2222-2222-222222222222';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted > 0 THEN
    RAISE EXCEPTION 'FAIL  attacker deleted another token''s upvote (% row(s))', v_deleted;
  END IF;
  RAISE NOTICE '  PASS  attacker CANNOT delete another token''s upvote';

  -- ── The upvote must still be there ──
  -- NONE restores session_user (the table owner), which bypasses RLS.
  -- Named superusers differ per install, so do not hardcode 'postgres'.
  SET LOCAL ROLE NONE;
  SELECT COUNT(*) INTO v_visible FROM upvotes
   WHERE id = '22222222-2222-2222-2222-222222222222';
  IF v_visible <> 1 THEN
    RAISE EXCEPTION 'FAIL  victim upvote was destroyed';
  END IF;
  RAISE NOTICE '  PASS  victim upvote survives (upvote_count cannot be griefed down)';
  SET LOCAL ROLE anon;

  -- ── S2.16 defect 2: every notification email was world-readable ──
  SELECT COUNT(*) INTO v_visible FROM user_notifications;
  IF v_visible > 0 THEN
    RAISE EXCEPTION 'FAIL  attacker read % notification row(s) — email leak', v_visible;
  END IF;
  RAISE NOTICE '  PASS  attacker CANNOT read another token''s notification email';

  -- ── The enabling hole: upvotes SELECT used to publish reporter_token ──
  SELECT COUNT(*) INTO v_visible FROM upvotes;
  IF v_visible > 0 THEN
    RAISE EXCEPTION 'FAIL  attacker enumerated % upvote row(s), harvesting tokens', v_visible;
  END IF;
  RAISE NOTICE '  PASS  attacker CANNOT enumerate upvotes to harvest reporter_tokens';

  -- ── Reports stay publicly readable: this is a public map ──
  SELECT COUNT(*) INTO v_visible FROM reports;
  IF v_visible < 1 THEN
    RAISE EXCEPTION 'FAIL  public report read broke — the map would be empty';
  END IF;
  RAISE NOTICE '  PASS  reports remain publicly readable (the map still works)';

  -- ── Anonymous submission must still work: PRD §6.1 ──
  INSERT INTO reports (reporter_token, category, lat, lng, status)
  VALUES ('attacker-token', 'graffiti', -37.82, 144.97, 'reported');
  RAISE NOTICE '  PASS  anonymous users can still submit reports';

  -- ── Comment authorship cannot be forged (migration 015) ──
  BEGIN
    INSERT INTO comments (report_id, reporter_token, body)
    VALUES ('11111111-1111-1111-1111-111111111111', 'victim-token', 'forged as the victim');
    RAISE EXCEPTION 'FAIL  attacker posted a comment as another token';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '  PASS  attacker CANNOT post a comment as another token';
  END;

  -- ── Council impersonation cannot be self-granted ──
  BEGIN
    INSERT INTO comments (report_id, reporter_token, body, is_council)
    VALUES ('11111111-1111-1111-1111-111111111111', 'attacker-token', 'Official notice', TRUE);
    RAISE EXCEPTION 'FAIL  attacker posted a comment flagged as council';
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      RAISE NOTICE '  PASS  attacker CANNOT post as the council';
  END;

  -- ── Own-row access must still work, or the fix broke the feature ──
  PERFORM set_config('request.headers', '{"x-reporter-token":"victim-token"}', true);
  SELECT COUNT(*) INTO v_visible FROM upvotes;
  IF v_visible <> 1 THEN
    RAISE EXCEPTION 'FAIL  victim cannot see their OWN upvote (% rows) — feature broken', v_visible;
  END IF;
  RAISE NOTICE '  PASS  a user CAN still see their own upvote ("have I upvoted this?")';

  SELECT COUNT(*) INTO v_visible FROM user_notifications;
  IF v_visible <> 1 THEN
    RAISE EXCEPTION 'FAIL  victim cannot read their own notification row';
  END IF;
  RAISE NOTICE '  PASS  a user CAN still read their own notification settings';

  -- ══════════════════════════════════════════════════════════
  -- Migration 025 — the tokens themselves.
  --
  -- 015 said "we also stop handing the tokens out". It did not. RLS is
  -- row-level, and reports/comments/report_photos/badges_earned are all
  -- world-readable by design, so `SELECT reporter_token FROM reports` handed
  -- any anonymous caller a working credential. Every residual risk 015
  -- accepted ("a caller who already knows a victim's token") was therefore
  -- reachable from the public anon key alone.
  --
  -- The tests above never caught it because they *give* the attacker a token
  -- and ask what they can do with it. These ask whether one can be obtained.
  -- ══════════════════════════════════════════════════════════
  PERFORM set_config('request.headers', '{"x-reporter-token":"attacker-token"}', true);

  -- ── Step 1 of the chain: harvest. Must fail on every table. ──
  FOR v_tbl, v_col IN
    SELECT * FROM (VALUES
      ('reports',       'reporter_token'),
      ('comments',      'reporter_token'),
      ('badges_earned', 'reporter_token'),
      ('report_photos', 'uploaded_by_token')
    ) AS t(tbl, col)
  LOOP
    -- Guard against the assertion passing because the table is empty.
    EXECUTE format('SELECT count(*) FROM %I', v_tbl) INTO v_visible;
    IF v_visible < 1 THEN
      RAISE EXCEPTION 'FAIL  % has no rows — the harvest test would pass vacuously', v_tbl;
    END IF;

    BEGIN
      EXECUTE format('SELECT count(%I) FROM %I', v_col, v_tbl) INTO v_visible;
      RAISE EXCEPTION 'FAIL  attacker harvested %.% (% row(s)) — any reporter is impersonable', v_tbl, v_col, v_visible;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE NOTICE '  PASS  attacker CANNOT read %.%', v_tbl, v_col;
    END;
  END LOOP;

  -- ── The same column, reached the other three ways ──
  -- Naming a column in WHERE or ORDER BY needs SELECT on it just as much as
  -- naming it in the select list. If any of these succeeded the revoke would
  -- be cosmetic: a binary search on `WHERE reporter_token < 'm'` recovers a
  -- token one character at a time without ever selecting it.
  BEGIN
    SELECT count(*) INTO v_visible FROM reports WHERE reporter_token = 'victim-token';
    RAISE EXCEPTION 'FAIL  attacker filtered on reports.reporter_token (% row(s)) — tokens are guessable by probe', v_visible;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '  PASS  attacker CANNOT filter on reports.reporter_token';
  END;

  BEGIN
    SELECT count(*) INTO v_visible FROM (SELECT id FROM reports ORDER BY reporter_token LIMIT 1) s;
    RAISE EXCEPTION 'FAIL  attacker ordered by reports.reporter_token — tokens leak through row order';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '  PASS  attacker CANNOT order by reports.reporter_token';
  END;

  BEGIN
    -- `select=*` is what PostgREST sends by default, and what useReport.ts and
    -- useComments.ts used to send.
    SELECT count(*) INTO v_visible FROM (SELECT * FROM reports LIMIT 1) s;
    RAISE EXCEPTION 'FAIL  SELECT * on reports still returns the token column';
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE '  PASS  SELECT * on reports is refused (it would include the token)';
  END;

  -- ── The chain is broken at step 1, so steps 2-4 are unreachable ──
  -- 015's own threat model conceded that a caller holding a victim's token can
  -- spoof the header and read their email. That concession is only survivable
  -- while tokens are not free. Prove they are not: with a token the attacker
  -- did not harvest, the spoof yields nothing.
  SELECT count(*) INTO v_visible FROM user_notifications;
  IF v_visible > 0 THEN
    RAISE EXCEPTION 'FAIL  harvest->spoof->read-email chain still completes';
  END IF;
  RAISE NOTICE '  PASS  harvest->spoof->read-email chain is broken at step 1';

  -- ── Neither role may read it: councils are clients too ──
  IF has_column_privilege('authenticated', 'reports', 'reporter_token', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL  the authenticated role (council staff) can still read reports.reporter_token';
  END IF;
  RAISE NOTICE '  PASS  council staff (authenticated) also cannot read reporter_token';

  -- ── Fail-closed tripwire ──
  -- 025 replaces the table-level SELECT grant with a column-level one, so a
  -- column added by a LATER migration is invisible to anon until someone
  -- re-runs restrict_public_columns(). That is the safe direction to fail, but
  -- it fails silently as a blank field in the UI. This turns it into a build
  -- failure naming the exact column.
  FOR v_tbl, v_col IN
    SELECT c.relname, a.attname
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relname IN ('reports', 'comments', 'badges_earned', 'report_photos')
       AND a.attnum > 0
       AND NOT a.attisdropped
       AND a.attname NOT IN ('reporter_token', 'uploaded_by_token')
  LOOP
    IF NOT has_column_privilege('anon', v_tbl, v_col, 'SELECT') THEN
      RAISE EXCEPTION 'FAIL  anon lost SELECT on %.% — a migration added a column without calling restrict_public_columns()', v_tbl, v_col;
    END IF;
  END LOOP;
  RAISE NOTICE '  PASS  every other column of those four tables is still public';

  -- ── The replacements must actually work, or the fix broke the app ──

  -- my_reports(): the attacker sees their own report and nothing else.
  SELECT count(*) INTO v_visible FROM my_reports();
  IF v_visible <> 1 THEN
    RAISE EXCEPTION 'FAIL  my_reports() returned % rows for the attacker, expected their 1', v_visible;
  END IF;
  RAISE NOTICE '  PASS  my_reports() returns the caller''s own reports';

  PERFORM set_config('request.headers', '{"x-reporter-token":"victim-token"}', true);
  SELECT count(*) INTO v_visible
    FROM my_reports() WHERE id = '11111111-1111-1111-1111-111111111111';
  IF v_visible <> 1 THEN
    RAISE EXCEPTION 'FAIL  the victim cannot see their own report through my_reports()';
  END IF;
  RAISE NOTICE '  PASS  my_reports() replaces the .eq(reporter_token) the client can no longer send';

  -- A caller with no token must get nothing, not everything. This is the line
  -- between a scoped query and an accidental full dump.
  PERFORM set_config('request.headers', '{"accept":"application/json"}', true);
  SELECT count(*) INTO v_visible FROM my_reports();
  IF v_visible <> 0 THEN
    RAISE EXCEPTION 'FAIL  my_reports() returned % rows with no token header', v_visible;
  END IF;
  RAISE NOTICE '  PASS  my_reports() returns nothing when no token is sent';

  -- is_my_report(): a boolean, correct in both directions.
  PERFORM set_config('request.headers', '{"x-reporter-token":"victim-token"}', true);
  SELECT is_my_report('11111111-1111-1111-1111-111111111111') INTO v_bool;
  IF NOT v_bool THEN
    RAISE EXCEPTION 'FAIL  is_my_report() denied the owner — fix confirmation would be unreachable';
  END IF;

  PERFORM set_config('request.headers', '{"x-reporter-token":"attacker-token"}', true);
  SELECT is_my_report('11111111-1111-1111-1111-111111111111') INTO v_bool;
  IF v_bool THEN
    RAISE EXCEPTION 'FAIL  is_my_report() claimed another token''s report';
  END IF;
  RAISE NOTICE '  PASS  is_my_report() is true only for the caller''s own report';

  -- report_comments(): authorship as a boolean, never as a token.
  SELECT count(*) INTO v_visible
    FROM report_comments('11111111-1111-1111-1111-111111111111');
  IF v_visible < 1 THEN
    RAISE EXCEPTION 'FAIL  report_comments() returned nothing — the thread would be empty';
  END IF;

  SELECT bool_or(is_mine) INTO v_bool
    FROM report_comments('11111111-1111-1111-1111-111111111111');
  IF v_bool THEN
    RAISE EXCEPTION 'FAIL  report_comments() marked another token''s comment as mine';
  END IF;

  PERFORM set_config('request.headers', '{"x-reporter-token":"victim-token"}', true);
  SELECT bool_and(is_mine) INTO v_bool
    FROM report_comments('11111111-1111-1111-1111-111111111111')
   WHERE id = '44444444-4444-4444-4444-444444444444';
  IF NOT v_bool THEN
    RAISE EXCEPTION 'FAIL  report_comments() did not mark the victim''s own comment as mine';
  END IF;
  RAISE NOTICE '  PASS  report_comments() reports authorship as is_mine, correctly both ways';

  -- Same guarantee 01_verify asserts for leaderboard(): the shape itself must
  -- not be able to carry a token, whatever the body does.
  FOR v_text IN
    SELECT p.proname || ' -> ' || pg_get_function_result(p.oid)
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname IN ('my_reports', 'is_my_report', 'report_comments')
  LOOP
    IF v_text ILIKE '%token%' THEN
      RAISE EXCEPTION 'FAIL  a replacement function returns a token column: %', v_text;
    END IF;
  END LOOP;
  RAISE NOTICE '  PASS  no replacement function''s signature can return a token';

  -- Restore the header the earlier assertions left in place.
  PERFORM set_config('request.headers', '{"x-reporter-token":"victim-token"}', true);

  RAISE NOTICE '';
  RAISE NOTICE '=== ALL RLS ASSERTIONS PASSED ===';
END $$;

RESET ROLE;
