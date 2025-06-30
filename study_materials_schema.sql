-- Create tables for course study materials

-- eBooks table
CREATE TABLE IF NOT EXISTS course_ebooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_size TEXT DEFAULT 'Unknown',
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notes table
CREATE TABLE IF NOT EXISTS course_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_size TEXT DEFAULT 'Unknown',
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sample Questions table
CREATE TABLE IF NOT EXISTS course_sample_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_size TEXT DEFAULT 'Unknown',
    question_type TEXT NOT NULL DEFAULT 'practice' CHECK (question_type IN ('practice', 'mock_test', 'chapter_wise')),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Previous Year Questions table
CREATE TABLE IF NOT EXISTS course_previous_year_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_size TEXT DEFAULT 'Unknown',
    year TEXT NOT NULL,
    exam_type TEXT NOT NULL DEFAULT 'final' CHECK (exam_type IN ('final', 'midterm', 'quiz', 'assignment')),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_course_ebooks_course_id ON course_ebooks(course_id);
CREATE INDEX IF NOT EXISTS idx_course_ebooks_upload_date ON course_ebooks(upload_date DESC);

CREATE INDEX IF NOT EXISTS idx_course_notes_course_id ON course_notes(course_id);
CREATE INDEX IF NOT EXISTS idx_course_notes_upload_date ON course_notes(upload_date DESC);

CREATE INDEX IF NOT EXISTS idx_course_sample_questions_course_id ON course_sample_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_sample_questions_upload_date ON course_sample_questions(upload_date DESC);
CREATE INDEX IF NOT EXISTS idx_course_sample_questions_type ON course_sample_questions(question_type);

CREATE INDEX IF NOT EXISTS idx_course_previous_year_questions_course_id ON course_previous_year_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_course_previous_year_questions_year ON course_previous_year_questions(year DESC);
CREATE INDEX IF NOT EXISTS idx_course_previous_year_questions_exam_type ON course_previous_year_questions(exam_type);

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE course_ebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_sample_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_previous_year_questions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (adjust based on your auth setup)
-- Assuming you have a user authentication system in place

-- eBooks policies
CREATE POLICY IF NOT EXISTS "Enable read access for authenticated users" ON course_ebooks
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" ON course_ebooks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable update for authenticated users" ON course_ebooks
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable delete for authenticated users" ON course_ebooks
    FOR DELETE USING (auth.role() = 'authenticated');

-- Notes policies
CREATE POLICY IF NOT EXISTS "Enable read access for authenticated users" ON course_notes
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" ON course_notes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable update for authenticated users" ON course_notes
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable delete for authenticated users" ON course_notes
    FOR DELETE USING (auth.role() = 'authenticated');

-- Sample Questions policies
CREATE POLICY IF NOT EXISTS "Enable read access for authenticated users" ON course_sample_questions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" ON course_sample_questions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable update for authenticated users" ON course_sample_questions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable delete for authenticated users" ON course_sample_questions
    FOR DELETE USING (auth.role() = 'authenticated');

-- Previous Year Questions policies
CREATE POLICY IF NOT EXISTS "Enable read access for authenticated users" ON course_previous_year_questions
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable insert for authenticated users" ON course_previous_year_questions
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable update for authenticated users" ON course_previous_year_questions
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY IF NOT EXISTS "Enable delete for authenticated users" ON course_previous_year_questions
    FOR DELETE USING (auth.role() = 'authenticated');
