-- Step 4: Create bookings table
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  consumer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transporter_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Locations
  pickup_address TEXT NOT NULL,
  pickup_lat NUMERIC(10, 7) NOT NULL,
  pickup_lng NUMERIC(10, 7) NOT NULL,
  dropoff_address TEXT NOT NULL,
  dropoff_lat NUMERIC(10, 7) NOT NULL,
  dropoff_lng NUMERIC(10, 7) NOT NULL,
  
  -- Item details
  item_type item_type NOT NULL,
  item_size item_size NOT NULL,
  item_photos TEXT[],
  special_instructions TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  
  -- Pricing
  distance_km NUMERIC(5, 2) NOT NULL,
  base_price NUMERIC(8, 2) NOT NULL,
  distance_price NUMERIC(8, 2) NOT NULL,
  extras_price NUMERIC(8, 2) DEFAULT 0,
  total_price NUMERIC(8, 2) NOT NULL,
  platform_fee NUMERIC(8, 2) NOT NULL,
  transporter_earnings NUMERIC(8, 2) NOT NULL,
  
  -- Status
  status booking_status DEFAULT 'pending',
  
  -- Ratings
  consumer_rating INTEGER CHECK (consumer_rating >= 1 AND consumer_rating <= 5),
  consumer_review TEXT,
  transporter_rating INTEGER CHECK (transporter_rating >= 1 AND transporter_rating <= 5),
  transporter_review TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookings
CREATE POLICY "Consumers can view their own bookings" ON bookings
  FOR SELECT USING (consumer_id = auth.uid());

CREATE POLICY "Transporters can view assigned bookings" ON bookings
  FOR SELECT USING (transporter_id = auth.uid());

CREATE POLICY "Transporters can view pending bookings" ON bookings
  FOR SELECT USING (
    status = 'pending' AND 
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'transporter')
  );

CREATE POLICY "Admins can view all bookings" ON bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Consumers can create bookings" ON bookings
  FOR INSERT WITH CHECK (consumer_id = auth.uid());

CREATE POLICY "Transporters can update assigned bookings" ON bookings
  FOR UPDATE USING (transporter_id = auth.uid());

CREATE POLICY "Admins can update all bookings" ON bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Create indexes for performance
CREATE INDEX idx_bookings_consumer ON bookings(consumer_id);
CREATE INDEX idx_bookings_transporter ON bookings(transporter_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created ON bookings(created_at DESC);