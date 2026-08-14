-- ============================================================
-- 015 — Scope anonymous writes to the caller's own reporter_token
--
-- Fixes MASTERPLAN S2.16 (discovered Aug 2026). Two policies in 010 were named
-- "_own" but written USING (true):
--
--   upvotes_delete_own            → any anon caller could delete ANY upvote.
--                                   The update_upvote_count() trigger would then
--                                   happily drive upvote_count and
--                                   priority_score down with it, which is a
--                                   quiet way to suppress a report the council
--                                   would otherwise see.
--   user_notifications_select_all → every stored notification email and Web Push
--                                   subscription was world-readable with nothing
--                                   but the public anon key.
--
-- There is deliberately no auth here — PRD §6.1 requires reporting without an
-- account, so there is no JWT to scope against. Instead the client sends its
-- reporter_token as a request header (see src/lib/supabase.ts) and RLS reads it
-- back out of the request context.
--
-- Threat model, stated honestly:
--   * This stops the *bulk* attacks — enumerate-and-delete, dump-all-emails.
--     Those were trivially possible before and are the real risk.
--   * A caller who already knows a specific victim's token can still spoof that
--     header. Closing that needs real auth, which the anonymous-reporting
--     product requirement forbids at this tier.
--   * So we also stop handing the tokens out: upvotes_select_all previously
--     exposed reporter_token to anyone, which made the spoof trivial to set up.
--     Public upvote counts come from reports.upvote_count (maintained by the
--     011 trigger) and never needed the raw rows.
--   * Anything requiring stronger guarantees goes through an Edge Function with
--     the service role, which bypasses RLS by design.
-- ============================================================

-- Reads the caller's reporter token from the request headers.
-- Returns NULL when absent, and every policy below is written so that NULL
-- matches nothing rather than matching everything.
CREATE OR REPLACE FUNCTION public.current_reporter_token()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(
    current_setting('request.headers', true)::json ->> 'x-reporter-token',
    ''
  );
$$;

-- ── upvotes ──────────────────────────────────────────────────
-- Public reads exposed reporter_token, which is the credential this scheme
-- depends on. Callers only ever need their own rows ("have I upvoted this?");
-- the public tally lives on reports.upvote_count.
DROP POLICY IF EXISTS "upvotes_select_all" ON upvotes;
CREATE POLICY "upvotes_select_own" ON upvotes
  FOR SELECT USING (reporter_token = public.current_reporter_token());

DROP POLICY IF EXISTS "upvotes_insert_all" ON upvotes;
CREATE POLICY "upvotes_insert_own" ON upvotes
  FOR INSERT WITH CHECK (reporter_token = public.current_reporter_token());

-- The headline fix: was USING (true).
DROP POLICY IF EXISTS "upvotes_delete_own" ON upvotes;
CREATE POLICY "upvotes_delete_own" ON upvotes
  FOR DELETE USING (reporter_token = public.current_reporter_token());

-- ── user_notifications ───────────────────────────────────────
-- Holds email addresses and Web Push subscriptions. Nothing here may be world
-- readable; PRD §13.2 lists email as opt-in and stored only for notifications.
DROP POLICY IF EXISTS "user_notifications_select_all" ON user_notifications;
CREATE POLICY "user_notifications_select_own" ON user_notifications
  FOR SELECT USING (reporter_token = public.current_reporter_token());

DROP POLICY IF EXISTS "user_notifications_insert_all" ON user_notifications;
CREATE POLICY "user_notifications_insert_own" ON user_notifications
  FOR INSERT WITH CHECK (reporter_token = public.current_reporter_token());

DROP POLICY IF EXISTS "user_notifications_update_own" ON user_notifications;
CREATE POLICY "user_notifications_update_own" ON user_notifications
  FOR UPDATE USING (reporter_token = public.current_reporter_token())
  WITH CHECK (reporter_token = public.current_reporter_token());

DROP POLICY IF EXISTS "user_notifications_delete_own" ON user_notifications;
CREATE POLICY "user_notifications_delete_own" ON user_notifications
  FOR DELETE USING (reporter_token = public.current_reporter_token());

-- ── comments ─────────────────────────────────────────────────
-- Comments are public by design (PRD §6.8), so SELECT stays open. But inserting
-- as someone else's token would let an attacker attribute speech to another
-- reporter, so authorship is pinned to the caller.
DROP POLICY IF EXISTS "comments_insert_all" ON comments;
CREATE POLICY "comments_insert_own" ON comments
  FOR INSERT WITH CHECK (
    reporter_token = public.current_reporter_token()
    -- Only the service role may post as the council.
    AND is_council = FALSE
    AND is_pinned = FALSE
  );

COMMENT ON FUNCTION public.current_reporter_token() IS
  'Anonymous caller identity from the x-reporter-token request header. NULL when absent; all policies treat NULL as matching no rows.';
