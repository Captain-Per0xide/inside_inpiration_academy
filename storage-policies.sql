-- Storage RLS Policies for inside-inspiration-academy-assets bucket
-- Run this in Supabase Dashboard > SQL Editor

-- Allow public uploads to the bucket
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'inside-inspiration-academy-assets');

-- Allow public reads from the bucket  
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'inside-inspiration-academy-assets');

-- Allow public deletes (for admin functions)
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'inside-inspiration-academy-assets');

-- Allow public updates (for overwriting files)
CREATE POLICY "Allow public updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'inside-inspiration-academy-assets');
