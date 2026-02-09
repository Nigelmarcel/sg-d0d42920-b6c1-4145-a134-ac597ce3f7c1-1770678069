-- Create storage policies for chat_photos bucket
CREATE POLICY "Users can upload chat photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat_photos' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM bookings 
    WHERE consumer_id = auth.uid() 
       OR transporter_id = auth.uid()
  )
);

CREATE POLICY "Users can view chat photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat_photos'
  AND (
    auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM bookings 
      WHERE consumer_id = auth.uid() 
         OR transporter_id = auth.uid()
    )
    OR bucket_id = 'chat_photos'
  )
);

CREATE POLICY "Users can delete their chat photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat_photos'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM bookings 
    WHERE consumer_id = auth.uid() 
       OR transporter_id = auth.uid()
  )
);

CREATE POLICY "Public access to chat photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat_photos');