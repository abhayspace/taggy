-- Fix relationships table foreign keys
ALTER TABLE public.relationships 
  DROP CONSTRAINT IF EXISTS relationships_user_id_fkey,
  DROP CONSTRAINT IF EXISTS relationships_partner_id_fkey;

ALTER TABLE public.relationships 
  ADD CONSTRAINT relationships_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD CONSTRAINT relationships_partner_id_fkey 
    FOREIGN KEY (partner_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add status field to relationships if not exists
ALTER TABLE public.relationships 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' 
  CHECK (status IN ('pending', 'accepted', 'rejected'));

-- Add privacy setting to relationships
ALTER TABLE public.relationships 
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, blocked_user_id)
);

ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their blocks"
  ON public.blocked_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can block others"
  ON public.blocked_users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unblock"
  ON public.blocked_users FOR DELETE
  USING (auth.uid() = user_id);

-- Create muted_users table
CREATE TABLE IF NOT EXISTS public.muted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  muted_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, muted_user_id)
);

ALTER TABLE public.muted_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their mutes"
  ON public.muted_users FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mute others"
  ON public.muted_users FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unmute"
  ON public.muted_users FOR DELETE
  USING (auth.uid() = user_id);

-- Create relationship_milestones table
CREATE TABLE IF NOT EXISTS public.relationship_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('first_friend', 'first_proposal', 'first_relationship', 'long_term_friendship', 'popular_user')),
  achieved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, milestone_type)
);

ALTER TABLE public.relationship_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones"
  ON public.relationship_milestones FOR SELECT
  USING (true);

CREATE POLICY "System can create milestones"
  ON public.relationship_milestones FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to award milestones
CREATE OR REPLACE FUNCTION award_milestone(_user_id UUID, _milestone_type TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.relationship_milestones (user_id, milestone_type)
  VALUES (_user_id, _milestone_type)
  ON CONFLICT (user_id, milestone_type) DO NOTHING;
END;
$$;

-- Trigger to award first friend milestone
CREATE OR REPLACE FUNCTION award_first_friend_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if this is user's first friend
  IF (SELECT COUNT(*) FROM friends WHERE user_id = NEW.user_id) = 1 THEN
    PERFORM award_milestone(NEW.user_id, 'first_friend');
  END IF;
  IF (SELECT COUNT(*) FROM friends WHERE user_id = NEW.friend_id) = 1 THEN
    PERFORM award_milestone(NEW.friend_id, 'first_friend');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_first_friend_milestone ON friends;
CREATE TRIGGER trigger_first_friend_milestone
  AFTER INSERT ON friends
  FOR EACH ROW EXECUTE FUNCTION award_first_friend_milestone();

-- Trigger to award first relationship milestone
CREATE OR REPLACE FUNCTION award_first_relationship_milestone()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    -- Check if this is user's first relationship
    IF (SELECT COUNT(*) FROM relationships WHERE (user_id = NEW.user_id OR partner_id = NEW.user_id) AND status = 'accepted') = 1 THEN
      PERFORM award_milestone(NEW.user_id, 'first_relationship');
    END IF;
    IF (SELECT COUNT(*) FROM relationships WHERE (user_id = NEW.partner_id OR partner_id = NEW.partner_id) AND status = 'accepted') = 1 THEN
      PERFORM award_milestone(NEW.partner_id, 'first_relationship');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_first_relationship_milestone ON relationships;
CREATE TRIGGER trigger_first_relationship_milestone
  AFTER UPDATE ON relationships
  FOR EACH ROW EXECUTE FUNCTION award_first_relationship_milestone();

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE blocked_users;
ALTER PUBLICATION supabase_realtime ADD TABLE muted_users;
ALTER PUBLICATION supabase_realtime ADD TABLE relationship_milestones;