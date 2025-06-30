# Supabase Storage RLS Fix

## Problem
Your storage bucket has Row Level Security enabled but no policies allowing uploads.

## Quick Fix - Disable RLS for Storage
1. Go to your Supabase Dashboard
2. Navigate to Storage > Settings
3. Find your `inside-inspiration-academy-assets` bucket
4. Click on "Edit Bucket"
5. UNCHECK "Enable RLS" option
6. Save changes

## Alternative Fix - Create Storage Policies
If you want to keep RLS enabled, add these policies in SQL Editor:

```sql
-- Allow public uploads to the bucket
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'inside-inspiration-academy-assets');

-- Allow public reads from the bucket
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'inside-inspiration-academy-assets');

-- Allow public deletes (for admin functions)
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'inside-inspiration-academy-assets');
```

## Test After Fix
Use the green "🧪 Test Connection" button in the app to verify the fix works.
