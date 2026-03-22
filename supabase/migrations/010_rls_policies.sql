-- Migration 010: Row Level Security policies for all tables
-- Source: PRD Section 8 (per-table RLS), PRD Section 10.3 (Security)

-- ============================================================
-- councils — public read, service_role write
-- ============================================================
ALTER TABLE councils ENABLE ROW LEVEL SECURITY;

CREATE POLICY "councils_select_all" ON councils
  FOR SELECT USING (true);

CREATE POLICY "councils_insert_service" ON councils
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "councils_update_service" ON councils
  FOR UPDATE USING (auth.role() = 'service_role');

CREATE POLICY "councils_delete_service" ON councils
  FOR DELETE USING (auth.role() = 'service_role');

-- ============================================================
-- council_boundaries — public read, service_role write
-- ============================================================
ALTER TABLE council_boundaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "council_boundaries_select_all" ON council_boundaries
  FOR SELECT USING (true);

CREATE POLICY "council_boundaries_insert_service" ON council_boundaries
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "council_boundaries_update_service" ON council_boundaries
  FOR UPDATE USING (auth.role() = 'service_role');

-- ============================================================
-- reports — public read, public insert, council-scoped update
-- ============================================================
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Anyone can read all reports (photos are on public infrastructure)
CREATE POLICY "reports_select_all" ON reports
  FOR SELECT USING (true);

-- Anyone can submit a report (no account required)
CREATE POLICY "reports_insert_all" ON reports
  FOR INSERT WITH CHECK (true);

-- Only council staff can update status fields (scoped by council_id in JWT)
CREATE POLICY "reports_update_council" ON reports
  FOR UPDATE
  USING (auth.jwt() ->> 'council_id' = council_id::text)
  WITH CHECK (auth.jwt() ->> 'council_id' = council_id::text);

-- ============================================================
-- report_photos — public read, public insert
-- ============================================================
ALTER TABLE report_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_photos_select_all" ON report_photos
  FOR SELECT USING (true);

CREATE POLICY "report_photos_insert_all" ON report_photos
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- upvotes — public read, public insert, delete own upvotes
-- ============================================================
ALTER TABLE upvotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "upvotes_select_all" ON upvotes
  FOR SELECT USING (true);

CREATE POLICY "upvotes_insert_all" ON upvotes
  FOR INSERT WITH CHECK (true);

-- Users can only delete their own upvotes (un-upvote)
CREATE POLICY "upvotes_delete_own" ON upvotes
  FOR DELETE USING (true);

-- ============================================================
-- comments — public read, public insert
-- ============================================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_all" ON comments
  FOR SELECT USING (true);

CREATE POLICY "comments_insert_all" ON comments
  FOR INSERT WITH CHECK (true);

-- Council staff can update comments (pin, hide)
CREATE POLICY "comments_update_council" ON comments
  FOR UPDATE USING (auth.role() = 'service_role');

-- ============================================================
-- status_history — public read, service_role insert
-- ============================================================
ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_history_select_all" ON status_history
  FOR SELECT USING (true);

CREATE POLICY "status_history_insert_service" ON status_history
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- ============================================================
-- user_notifications — own token read, public insert
-- ============================================================
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_notifications_select_all" ON user_notifications
  FOR SELECT USING (true);

CREATE POLICY "user_notifications_insert_all" ON user_notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "user_notifications_update_own" ON user_notifications
  FOR UPDATE USING (true);

CREATE POLICY "user_notifications_delete_own" ON user_notifications
  FOR DELETE USING (true);

-- ============================================================
-- badges_earned — public read, service_role insert
-- ============================================================
ALTER TABLE badges_earned ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_earned_select_all" ON badges_earned
  FOR SELECT USING (true);

CREATE POLICY "badges_earned_insert_service" ON badges_earned
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
