-- Create vehicle_type enum
CREATE TYPE vehicle_type AS ENUM ('van', 'stw', 'truck');

-- Add vehicle_type column to transporter_applications table
ALTER TABLE transporter_applications
ADD COLUMN vehicle_type vehicle_type DEFAULT 'van';

-- Add comment explaining the vehicle types
COMMENT ON COLUMN transporter_applications.vehicle_type IS 'Type of vehicle: van (small van), stw (station wagon), truck (larger truck)';