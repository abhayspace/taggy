-- Update profiles SELECT policy to allow viewing all profiles
-- This is needed for the Discover page to work
DROP POLICY IF EXISTS "Users can view own profile and friends' profiles" ON profiles;

CREATE POLICY "Users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);