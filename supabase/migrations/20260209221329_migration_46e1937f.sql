-- Drop existing upload policy
DROP POLICY IF EXISTS "Users can upload photos to their bookings" ON storage.objects;

-- Create corrected upload policy with simpler path matching
CREATE POLICY "Users can upload photos to their bookings" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-photos' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM bookings 
    WHERE consumer_id = auth.uid() OR transporter_id = auth.uid()
  )
);