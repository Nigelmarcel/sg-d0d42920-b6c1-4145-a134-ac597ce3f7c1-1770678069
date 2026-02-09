-- Drop the existing INSERT policy that's blocking the trigger
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;