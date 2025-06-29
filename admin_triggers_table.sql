-- Create admin_triggers table to track monthly payment review execution
CREATE TABLE IF NOT EXISTS admin_triggers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    triggered_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    students_processed INTEGER DEFAULT 0,
    courses_suspended INTEGER DEFAULT 0,
    users_affected INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on triggered_date for efficient querying
CREATE INDEX IF NOT EXISTS idx_admin_triggers_triggered_date ON admin_triggers(triggered_date);

-- Add RLS (Row Level Security) policy if needed
ALTER TABLE admin_triggers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow admins to read trigger logs
CREATE POLICY "Allow admin users to read trigger logs" ON admin_triggers
    FOR SELECT USING (true);

-- Create policy to allow system to insert trigger logs
CREATE POLICY "Allow system to insert trigger logs" ON admin_triggers
    FOR INSERT WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE admin_triggers IS 'Tracks execution of monthly payment review triggers by admin users';
COMMENT ON COLUMN admin_triggers.triggered_date IS 'Date and time when the trigger was executed';
COMMENT ON COLUMN admin_triggers.students_processed IS 'Number of students processed in this trigger run';
COMMENT ON COLUMN admin_triggers.courses_suspended IS 'Number of courses that were suspended due to overdue payments';
COMMENT ON COLUMN admin_triggers.users_affected IS 'Number of users who had at least one course suspended';
