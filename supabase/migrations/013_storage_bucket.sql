-- Migration 013: Storage bucket and policies for report photos
-- Source: PRD Section 6.1 (Photo Handling), supabase/storage.sql

-- Create the reports storage bucket (public read, 5MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('reports', 'reports', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Public read: anyone can view report photos (infrastructure is public)
CREATE POLICY "reports_bucket_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'reports');

-- Public insert: anyone can upload photos for report submission
CREATE POLICY "reports_bucket_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'reports');

-- Service role delete: only admin can remove photos (moderation)
CREATE POLICY "reports_bucket_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'reports' AND auth.role() = 'service_role');
