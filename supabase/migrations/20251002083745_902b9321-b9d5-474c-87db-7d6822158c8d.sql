-- Create security definer function to check conversation participation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE user_id = _user_id
      AND conversation_id = _conversation_id
  )
$$;

-- Drop existing policy that causes infinite recursion
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;

-- Create new policy using the security definer function
CREATE POLICY "Users can view conversation participants"
ON conversation_participants FOR SELECT
TO authenticated
USING (
  public.is_conversation_participant(auth.uid(), conversation_id)
);