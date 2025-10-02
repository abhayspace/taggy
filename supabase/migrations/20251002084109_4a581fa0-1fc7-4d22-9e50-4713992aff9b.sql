-- Add UPDATE policy for conversations table
-- This is needed when updating the updated_at timestamp
CREATE POLICY "Users can update their conversations"
ON conversations FOR UPDATE
TO authenticated
USING (
  public.is_conversation_participant(auth.uid(), id)
)
WITH CHECK (
  public.is_conversation_participant(auth.uid(), id)
);