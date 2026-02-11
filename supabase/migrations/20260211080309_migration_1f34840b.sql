-- Add 'saved' column to bookings table for marking important trips
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS saved BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN bookings.saved IS 'Marks if the transporter has saved this trip for future reference';