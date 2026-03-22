-- Migration 009: Badges Earned table
-- Source: PRD Section 8.9

CREATE TABLE badges_earned (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_token TEXT NOT NULL,
  badge_slug TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reporter_token, badge_slug)
);

CREATE INDEX idx_badges_earned_token ON badges_earned(reporter_token);
