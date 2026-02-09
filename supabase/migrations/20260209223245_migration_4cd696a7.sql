-- Add policy for consumers to cancel their own pending bookings
CREATE POLICY "Consumers can cancel their own pending bookings"
ON bookings
FOR UPDATE
TO public
USING (
  consumer_id = auth.uid() 
  AND status = 'pending'
)
WITH CHECK (
  consumer_id = auth.uid() 
  AND status = 'pending'
);

-- Add policy for consumers to update cancelled bookings (set cancelled_at timestamp)
CREATE POLICY "Consumers can update their cancelled bookings"
ON bookings
FOR UPDATE
TO public
USING (
  consumer_id = auth.uid() 
  AND status = 'cancelled'
)
WITH CHECK (
  consumer_id = auth.uid() 
  AND status = 'cancelled'
);

-- Add policy for consumers to delete their completed or cancelled bookings
CREATE POLICY "Consumers can delete their completed or cancelled bookings"
ON bookings
FOR DELETE
TO public
USING (
  consumer_id = auth.uid() 
  AND status IN ('delivered', 'cancelled')
);