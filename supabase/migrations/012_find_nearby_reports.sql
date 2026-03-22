-- Migration 012: find_nearby_reports RPC function
-- Used by submit-report Edge Function for duplicate detection
-- Source: PRD Section 6.1 (Duplicate Detection edge case)

CREATE OR REPLACE FUNCTION find_nearby_reports(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_category TEXT,
  p_radius_meters INTEGER,
  p_days INTEGER
)
RETURNS TABLE(
  id UUID,
  upvote_count INTEGER,
  address TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.upvote_count, r.address
  FROM reports r
  WHERE r.category = p_category
    AND r.submitted_at > NOW() - (p_days || ' days')::INTERVAL
    AND earth_distance(
      ll_to_earth(r.lat, r.lng),
      ll_to_earth(p_lat, p_lng)
    ) <= p_radius_meters
  ORDER BY r.upvote_count DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;
