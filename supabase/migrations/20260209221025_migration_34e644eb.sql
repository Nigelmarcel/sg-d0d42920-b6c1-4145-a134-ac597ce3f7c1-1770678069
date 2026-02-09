-- Create storage bucket for chat photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-photos',
  'chat-photos',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic']
);

-- Policy: Users can upload photos for their own bookings
CREATE POLICY "Users can upload photos for their bookings"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-photos' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  EXISTS (
    SELECT 1 FROM bookings
    WHERE id::text = (storage.foldername(name))[2]
    AND (consumer_id = auth.uid() OR transporter_id = auth.uid())
  )
);

-- Policy: Users can view photos for their bookings
CREATE POLICY "Users can view photos for their bookings"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-photos' AND
  EXISTS (
    SELECT 1 FROM bookings
    WHERE id::text = (storage.foldername(name))[2]
    AND (consumer_id = auth.uid() OR transporter_id = auth.uid())
  )
);

-- Policy: Users can delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Admins can manage all photos
CREATE POLICY "Admins can manage all chat photos"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'chat-photos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);