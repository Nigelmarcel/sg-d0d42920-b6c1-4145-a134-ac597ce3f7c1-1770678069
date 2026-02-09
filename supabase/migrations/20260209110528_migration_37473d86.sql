-- Create a new INSERT policy that allows both:
-- 1. Users inserting their own profile (auth.uid() = id)
-- 2. The trigger function to insert on signup (bypasses RLS via SECURITY DEFINER)
CREATE POLICY "Enable insert for authenticated users and triggers" 
ON profiles
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = id  -- Allow users to insert their own profile
  OR 
  auth.uid() IS NULL  -- Allow trigger during signup (before auth is established)
);