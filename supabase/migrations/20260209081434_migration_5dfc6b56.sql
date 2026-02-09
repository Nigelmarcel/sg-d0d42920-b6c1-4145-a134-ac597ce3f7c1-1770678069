-- Step 6: Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view messages for their bookings" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = messages.booking_id 
      AND (bookings.consumer_id = auth.uid() OR bookings.transporter_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages for their bookings" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = booking_id 
      AND (bookings.consumer_id = auth.uid() OR bookings.transporter_id = auth.uid())
    )
  );

CREATE POLICY "Users can mark their own messages as read" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM bookings 
      WHERE bookings.id = messages.booking_id 
      AND (bookings.consumer_id = auth.uid() OR bookings.transporter_id = auth.uid())
    )
  );

-- Create index for performance
CREATE INDEX idx_messages_booking ON messages(booking_id, created_at);