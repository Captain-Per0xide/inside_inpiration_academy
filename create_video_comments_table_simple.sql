-- Simple video_comments table creation without foreign key constraints
-- This version avoids potential errors during setup

-- Create video_comments table for managing comments on videos
CREATE TABLE IF NOT EXISTS video_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id TEXT NOT NULL,
    course_id UUID NOT NULL,
    comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_video_comments_video_id ON video_comments(video_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_course_id ON video_comments(course_id);
CREATE INDEX IF NOT EXISTS idx_video_comments_created_at ON video_comments(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_video_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS video_comments_updated_at_trigger ON video_comments;
CREATE TRIGGER video_comments_updated_at_trigger
    BEFORE UPDATE ON video_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_video_comments_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE video_comments ENABLE ROW LEVEL SECURITY;

-- Policy to allow all authenticated users to read comments
CREATE POLICY "Allow read access to video comments" ON video_comments
    FOR SELECT TO authenticated
    USING (true);

-- Policy to allow authenticated users to insert comments
CREATE POLICY "Allow insert video comments" ON video_comments
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Policy to allow users to update comments
CREATE POLICY "Allow update video comments" ON video_comments
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON video_comments TO authenticated;
GRANT ALL ON video_comments TO service_role;

-- Sample comment structure in JSONB:
-- {
--   "id": "unique_comment_id",
--   "user_id": "user_uuid",
--   "user_name": "John Doe",
--   "user_image": "profile_image_url",
--   "comment_text": "Great explanation!",
--   "timestamp": "2025-07-03T10:30:00Z",
--   "likes": 0,
--   "replies": [
--     {
--       "id": "reply_id",
--       "user_id": "user_uuid",
--       "user_name": "Jane Smith",
--       "user_image": "profile_image_url",
--       "reply_text": "I agree!",
--       "timestamp": "2025-07-03T11:00:00Z",
--       "likes": 0
--     }
--   ]
-- }
