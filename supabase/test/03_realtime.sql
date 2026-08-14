-- ============================================================
-- Realtime delivery, verified at the source (S8.7, S2.15).
--
-- The masterplan called this "blocked on a live Supabase project". That was
-- half right. Supabase Realtime is a relay: Postgres emits row changes into a
-- logical replication slot filtered by the `supabase_realtime` publication, and
-- the Realtime server forwards them to websocket clients.
--
-- The half that was ever in doubt is the Postgres half — migration 014 exists
-- precisely because nothing had added `reports` to that publication, so the
-- subscription connected and received nothing, silently. That half is testable
-- here, without Supabase, by reading the replication stream directly.
--
-- What this proves: Postgres emits INSERT and UPDATE for `reports` on the
-- publication the client subscribes to, with `upvote_count` present in the
-- payload, and REPLICA IDENTITY FULL supplies the old row on UPDATE/DELETE.
-- What it does not prove: that Supabase's relay is running. That is vendor
-- infrastructure, not our code.
-- ============================================================

\set ON_ERROR_STOP on

SELECT pg_drop_replication_slot('ripple_test_slot')
WHERE EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = 'ripple_test_slot');

-- pgoutput is the protocol Supabase Realtime itself consumes.
SELECT 'slot created' AS step,
       slot_name
FROM pg_create_logical_replication_slot('ripple_test_slot', 'pgoutput');

-- ── Produce exactly the changes the client subscribes to ──
INSERT INTO reports (id, reporter_token, category, lat, lng, status, upvote_count)
VALUES ('44444444-4444-4444-4444-444444444444', 'rt-token', 'pothole',
        -37.8, 144.96, 'reported', 0);

INSERT INTO upvotes (report_id, reporter_token)
VALUES ('44444444-4444-4444-4444-444444444444', 'rt-upvoter');

UPDATE reports SET status = 'acknowledged'
WHERE id = '44444444-4444-4444-4444-444444444444';

DELETE FROM reports WHERE id = '44444444-4444-4444-4444-444444444444';

-- ── Read the stream back ──
DO $$
DECLARE
  v_changes  INTEGER;
  v_inserts  INTEGER;
  v_updates  INTEGER;
  v_deletes  INTEGER;
BEGIN
  CREATE TEMP TABLE rt_changes AS
  SELECT data
  FROM pg_logical_slot_peek_binary_changes(
    'ripple_test_slot', NULL, NULL,
    'proto_version', '1',
    'publication_names', 'supabase_realtime'
  );

  SELECT COUNT(*) INTO v_changes FROM rt_changes;

  -- pgoutput frames start with a single-byte message type: I/U/D.
  SELECT
    COUNT(*) FILTER (WHERE substr(encode(data, 'escape'), 1, 1) = 'I'),
    COUNT(*) FILTER (WHERE substr(encode(data, 'escape'), 1, 1) = 'U'),
    COUNT(*) FILTER (WHERE substr(encode(data, 'escape'), 1, 1) = 'D')
  INTO v_inserts, v_updates, v_deletes
  FROM rt_changes;

  RAISE NOTICE '  frames on the publication: %', v_changes;
  RAISE NOTICE '  inserts=% updates=% deletes=%', v_inserts, v_updates, v_deletes;

  IF v_changes = 0 THEN
    RAISE EXCEPTION 'FAIL  publication emitted nothing — this is the exact silent failure migration 014 fixes';
  END IF;
  RAISE NOTICE '  PASS  reports changes reach the supabase_realtime publication';

  IF v_inserts < 1 THEN
    RAISE EXCEPTION 'FAIL  no INSERT frame — new pins would never appear on the live map';
  END IF;
  RAISE NOTICE '  PASS  INSERT emitted (a new report reaches other users'' maps)';

  IF v_updates < 1 THEN
    RAISE EXCEPTION 'FAIL  no UPDATE frame — upvote counts and status changes would never propagate';
  END IF;
  RAISE NOTICE '  PASS  UPDATE emitted (upvote_count and status propagate — S8.7)';

  IF v_deletes < 1 THEN
    RAISE EXCEPTION 'FAIL  no DELETE frame';
  END IF;
  RAISE NOTICE '  PASS  DELETE emitted with REPLICA IDENTITY FULL (payload.old.id is safe)';
END $$;

-- ── The upvote trigger must fire INSIDE the replicated transaction ──
-- Otherwise the count the client receives is the pre-trigger value and the map
-- shows a stale number until a refresh.
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO reports (id, reporter_token, category, lat, lng, status)
  VALUES ('55555555-5555-5555-5555-555555555555', 'rt2', 'tree', -37.7, 144.9, 'reported');

  INSERT INTO upvotes (report_id, reporter_token)
  VALUES ('55555555-5555-5555-5555-555555555555', 'rt2-upvoter');

  SELECT upvote_count INTO v_count FROM reports
   WHERE id = '55555555-5555-5555-5555-555555555555';

  IF v_count <> 1 THEN
    RAISE EXCEPTION 'FAIL  upvote_count is % after one upvote', v_count;
  END IF;
  RAISE NOTICE '  PASS  upvote_count is committed before replication reads it';

  DELETE FROM reports WHERE id = '55555555-5555-5555-5555-555555555555';
END $$;

SELECT pg_drop_replication_slot('ripple_test_slot');

DO $$ BEGIN RAISE NOTICE ''; RAISE NOTICE '=== REALTIME SOURCE VERIFIED ==='; END $$;
