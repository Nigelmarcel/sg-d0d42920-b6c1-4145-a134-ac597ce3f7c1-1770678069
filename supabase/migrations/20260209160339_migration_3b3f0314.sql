-- Drop the old restrictive policy that prevents accepting jobs
DROP POLICY IF EXISTS "Transporters can update assigned bookings" ON bookings;