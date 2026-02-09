-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload chat photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view chat photos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their chat photos" ON storage.objects;
DROP POLICY IF EXISTS "Public access to chat photos" ON storage.objects;