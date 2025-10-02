-- Fix the infinite recursion issue in conversation_participants RLS policy
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

CREATE POLICY "Users can view conversation participants"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
        AND cp.user_id = auth.uid()
    )
  );