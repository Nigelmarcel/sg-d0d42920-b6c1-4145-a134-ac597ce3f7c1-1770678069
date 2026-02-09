-- Step 5: Create location_updates table
CREATE TABLE location_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  transporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lat NUMERIC(10, 7) NOT NULL,
  lng NUMERIC(10, 7) NOT NULL,
  heading NUMERIC(5, 2),
  speed NUMERIC(5, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE location_updates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for location_updates
CREATE POLICY "Transporters can insert their own location" ON location_updates
  FOR INSERT WITH CHECK (transporter_id = auth.uid());

CREATE POLICY "Users can view location for their bookings" ON location_updates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = location_updates.booking_id 
      AND (bookings.consumer_id = auth.uid() OR bookings.transporter_id = auth.uid())
    )
  );

CREATE POLICY "Admins can view all locations" ON location_updates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create index for performance
CREATE INDEX idx_location_booking ON location_updates(booking_id, created_at DESC);