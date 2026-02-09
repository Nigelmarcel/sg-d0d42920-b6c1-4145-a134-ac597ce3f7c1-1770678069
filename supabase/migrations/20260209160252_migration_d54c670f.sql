-- Fix RLS policy: Allow transporters to accept pending jobs
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Transporters can update their own bookings" ON bookings;

-- Create new policy: Transporters can update bookings where they are the transporter OR where they are accepting a pending job
CREATE POLICY "Transporters can update their bookings and accept pending jobs" 
ON bookings 
FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'transporter'
  )
  AND (
    transporter_id = auth.uid() OR 
    (status = 'pending' AND transporter_id IS NULL)
  )
);

-- Verify the policy was created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'bookings' 
AND policyname LIKE '%Transporters%';