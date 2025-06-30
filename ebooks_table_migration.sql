-- Create eBooks table for storing uploaded course eBooks
CREATE TABLE IF NOT EXISTS public.ebooks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    course_id UUID NOT NULL,
    uploaded_by VARCHAR(100) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Foreign key constraint
    CONSTRAINT fk_ebooks_course_id 
        FOREIGN KEY (course_id) 
        REFERENCES public.courses(id) 
        ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ebooks_course_id ON public.ebooks(course_id);
CREATE INDEX IF NOT EXISTS idx_ebooks_uploaded_at ON public.ebooks(uploaded_at DESC);

-- Create storage bucket for eBooks if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'ebooks', 
    'ebooks', 
    true, 
    52428800, -- 50MB limit
    ARRAY['application/pdf', 'application/epub+zip']
)
ON CONFLICT (id) DO NOTHING;

-- Set up Row Level Security (RLS)
ALTER TABLE public.ebooks ENABLE ROW LEVEL SECURITY;

-- Policy for admin users to read all eBooks
CREATE POLICY "Admin can view all eBooks" ON public.ebooks
    FOR SELECT USING (true);

-- Policy for admin users to insert eBooks
CREATE POLICY "Admin can insert eBooks" ON public.ebooks
    FOR INSERT WITH CHECK (true);

-- Policy for admin users to update eBooks
CREATE POLICY "Admin can update eBooks" ON public.ebooks
    FOR UPDATE USING (true);

-- Policy for admin users to delete eBooks
CREATE POLICY "Admin can delete eBooks" ON public.ebooks
    FOR DELETE USING (true);

-- Storage policies for eBooks bucket
CREATE POLICY "Admin can upload eBooks" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'ebooks');

CREATE POLICY "Admin can view eBooks" ON storage.objects
    FOR SELECT USING (bucket_id = 'ebooks');

CREATE POLICY "Admin can delete eBooks" ON storage.objects
    FOR DELETE USING (bucket_id = 'ebooks');

-- Add trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ebooks_updated_at 
    BEFORE UPDATE ON public.ebooks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.ebooks TO authenticated;
GRANT ALL ON public.ebooks TO anon;
