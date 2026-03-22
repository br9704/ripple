-- Migration 008: User Notifications table
-- Source: PRD Section 8.8

CREATE TABLE user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_token TEXT NOT NULL,
  notification_type TEXT CHECK (notification_type IN ('email', 'push')),
  email TEXT,                             -- only for email type
  push_subscription JSONB,               -- Web Push subscription
  report_id UUID REFERENCES reports(id),  -- which report to notify about
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_notifications_token ON user_notifications(reporter_token);
CREATE INDEX idx_user_notifications_report ON user_notifications(report_id);
