-- Add push_token column to users table for storing Expo push tokens
-- This will enable sending push notifications to individual users

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Add an index on push_token for better query performance
CREATE INDEX IF NOT EXISTS idx_users_push_token ON public.users(push_token);

-- Comment on the new column
COMMENT ON COLUMN public.users.push_token IS 'Expo push token for sending push notifications to user devices';

-- Optional: Add a constraint to ensure push tokens follow Expo format
-- ALTER TABLE public.users 
-- ADD CONSTRAINT valid_expo_push_token 
-- CHECK (push_token IS NULL OR push_token ~ '^ExponentPushToken\[.+\]$');
