-- Step 8: Create transporter_availability table
CREATE TABLE transporter_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_location_lat NUMERIC(10, 7),
  last_location_lng NUMERIC(10, 7),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(transporter_id)
);

-- Enable RLS
ALTER TABLE transporter_availability ENABLE ROW LEVEL SECURITY;

-- RLS Policies for transporter_availability
CREATE POLICY "Transporters can manage their own availability" ON transporter_availability
  FOR ALL USING (transporter_id = auth.uid());

CREATE POLICY "Admins can view all availability" ON transporter_availability
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create index for performance
CREATE INDEX idx_availability_online ON transporter_availability(is_online, last_location_lat, last_location_lng);