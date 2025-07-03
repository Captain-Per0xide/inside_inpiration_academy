-- Create likes table for comments and replies
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    comment_id TEXT NOT NULL,
    video_id TEXT NOT NULL,
    course_id UUID NOT NULL,
    like_type TEXT NOT NULL CHECK (like_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one like/dislike per user per comment
    UNIQUE(user_id, comment_id, video_id, course_id)
);

-- Enable RLS
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- Policies for comment_likes table
CREATE POLICY "Users can view all likes" ON comment_likes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes" ON comment_likes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own likes" ON comment_likes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON comment_likes
    FOR DELETE USING (auth.uid() = user_id);

-- Function to get like counts for comments
CREATE OR REPLACE FUNCTION get_comment_like_counts(p_video_id TEXT, p_course_id UUID)
RETURNS TABLE(comment_id TEXT, likes_count BIGINT, dislikes_count BIGINT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cl.comment_id,
        COUNT(*) FILTER (WHERE cl.like_type = 'like') AS likes_count,
        COUNT(*) FILTER (WHERE cl.like_type = 'dislike') AS dislikes_count
    FROM comment_likes cl
    WHERE cl.video_id = p_video_id AND cl.course_id = p_course_id
    GROUP BY cl.comment_id;
END;
$$;

-- Function to toggle like/dislike
CREATE OR REPLACE FUNCTION toggle_comment_like(
    p_user_id UUID,
    p_comment_id TEXT,
    p_video_id TEXT,
    p_course_id UUID,
    p_like_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    existing_like comment_likes%ROWTYPE;
    result JSON;
BEGIN
    -- Check if user already liked/disliked this comment
    SELECT * INTO existing_like
    FROM comment_likes
    WHERE user_id = p_user_id
      AND comment_id = p_comment_id
      AND video_id = p_video_id
      AND course_id = p_course_id;
    
    IF existing_like.id IS NOT NULL THEN
        -- User already has a like/dislike
        IF existing_like.like_type = p_like_type THEN
            -- Same type - remove the like/dislike
            DELETE FROM comment_likes WHERE id = existing_like.id;
            result = json_build_object('action', 'removed', 'type', p_like_type);
        ELSE
            -- Different type - update the like/dislike
            UPDATE comment_likes 
            SET like_type = p_like_type, updated_at = NOW()
            WHERE id = existing_like.id;
            result = json_build_object('action', 'updated', 'type', p_like_type, 'previous_type', existing_like.like_type);
        END IF;
    ELSE
        -- No existing like - create new one
        INSERT INTO comment_likes (user_id, comment_id, video_id, course_id, like_type)
        VALUES (p_user_id, p_comment_id, p_video_id, p_course_id, p_like_type);
        result = json_build_object('action', 'created', 'type', p_like_type);
    END IF;
    
    RETURN result;
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_comment_likes_video_course ON comment_likes(video_id, course_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user_comment ON comment_likes(user_id, comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment_type ON comment_likes(comment_id, like_type);

-- Trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_comment_likes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_likes_updated_at
    BEFORE UPDATE ON comment_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_comment_likes_updated_at();
