-- Create relationship status enum
CREATE TYPE public.relationship_status AS ENUM ('pending', 'accepted', 'rejected');

-- Create relationships table
CREATE TABLE public.relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status relationship_status NOT NULL DEFAULT 'pending',
  proposed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, partner_id),
  CHECK (user_id != partner_id)
);

-- Enable RLS
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;

-- Policies for relationships
CREATE POLICY "Users can view their own relationships"
  ON public.relationships
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create proposals"
  ON public.relationships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Partners can update relationship status"
  ON public.relationships
  FOR UPDATE
  USING (auth.uid() = partner_id)
  WITH CHECK (auth.uid() = partner_id);

-- Function to check if proposal is allowed
CREATE OR REPLACE FUNCTION public.can_propose_to(_partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    -- Check if they are friends
    SELECT 1 FROM public.friends 
    WHERE user_id = auth.uid() AND friend_id = _partner_id
  ) AND EXISTS (
    -- Check if they have messages from at least 2 days ago
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp1 ON cp1.conversation_id = m.conversation_id
    JOIN public.conversation_participants cp2 ON cp2.conversation_id = m.conversation_id
    WHERE cp1.user_id = auth.uid() 
      AND cp2.user_id = _partner_id
      AND m.created_at <= now() - interval '2 days'
  ) AND NOT EXISTS (
    -- Check no active relationship exists
    SELECT 1 FROM public.relationships
    WHERE (user_id = auth.uid() AND partner_id = _partner_id)
       OR (user_id = _partner_id AND partner_id = auth.uid())
  );
$$;

-- Trigger for updated_at
CREATE TRIGGER update_relationships_updated_at
  BEFORE UPDATE ON public.relationships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();