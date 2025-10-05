-- Phase 1: Fix Critical RLS Policies

-- 1. Secure user_points table - users can only view their own points
DROP POLICY IF EXISTS "Users can view all points" ON public.user_points;
CREATE POLICY "Users can view their own points" 
ON public.user_points 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Secure relationship_milestones - only milestone owner and friends can view
DROP POLICY IF EXISTS "Users can view milestones" ON public.relationship_milestones;
CREATE POLICY "Users can view their own and friends' milestones" 
ON public.relationship_milestones 
FOR SELECT 
USING ((auth.uid() = user_id) OR can_view_post(user_id));

-- 3. Add DELETE policy for profiles (GDPR compliance)
CREATE POLICY "Users can delete their own profile" 
ON public.profiles 
FOR DELETE 
USING (auth.uid() = id);

-- Phase 2: Strengthen Secret Code System

-- Add columns for secret code security
ALTER TABLE public.relationships 
ADD COLUMN IF NOT EXISTS secret_code_created_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS secret_code_attempts INTEGER DEFAULT 0;

-- Phase 3: Update Database Functions with search_path

-- Update award_points to be atomic with daily bonus
CREATE OR REPLACE FUNCTION public.award_points(_user_id uuid, _points integer, _action text, _description text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Insert or update user points
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, _points)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    total_points = user_points.total_points + _points,
    updated_at = now();
  
  -- Log transaction
  INSERT INTO public.point_transactions (user_id, points, action, description)
  VALUES (_user_id, _points, _action, _description);
END;
$function$;

-- Update can_view_post function
CREATE OR REPLACE FUNCTION public.can_view_post(_post_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT _post_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.friends 
    WHERE user_id = auth.uid() AND friend_id = _post_user_id
  )
$function$;

-- Update is_conversation_participant function
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE user_id = _user_id
      AND conversation_id = _conversation_id
  )
$function$;

-- Update is_friend_or_self function
CREATE OR REPLACE FUNCTION public.is_friend_or_self(_user_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT _user_id = _profile_id OR EXISTS (
    SELECT 1 FROM public.friends 
    WHERE user_id = _user_id AND friend_id = _profile_id
  )
$function$;

-- Update can_propose_to function
CREATE OR REPLACE FUNCTION public.can_propose_to(_partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.friends 
    WHERE user_id = auth.uid() AND friend_id = _partner_id
  ) AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.conversation_participants cp1 ON cp1.conversation_id = m.conversation_id
    JOIN public.conversation_participants cp2 ON cp2.conversation_id = m.conversation_id
    WHERE cp1.user_id = auth.uid() 
      AND cp2.user_id = _partner_id
      AND m.created_at <= now() - interval '2 days'
  ) AND NOT EXISTS (
    SELECT 1 FROM public.relationships
    WHERE (user_id = auth.uid() AND partner_id = _partner_id)
       OR (user_id = _partner_id AND partner_id = auth.uid())
  );
$function$;

-- Update send_gift function
CREATE OR REPLACE FUNCTION public.send_gift(_gift_id uuid, _receiver_id uuid, _message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _sender_id UUID := auth.uid();
  _gift_price INTEGER;
  _sender_points INTEGER;
  _gift_name TEXT;
BEGIN
  SELECT price, name INTO _gift_price, _gift_name
  FROM public.gifts
  WHERE id = _gift_id;
  
  IF _gift_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;
  
  SELECT total_points INTO _sender_points
  FROM public.user_points
  WHERE user_id = _sender_id;
  
  IF _sender_points IS NULL OR _sender_points < _gift_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  
  UPDATE public.user_points
  SET total_points = total_points - _gift_price,
      updated_at = now()
  WHERE user_id = _sender_id;
  
  INSERT INTO public.point_transactions (user_id, points, action, description)
  VALUES (_sender_id, -_gift_price, 'gift_sent', 'Sent ' || _gift_name || ' to user');
  
  INSERT INTO public.user_gifts (gift_id, sender_id, receiver_id, message)
  VALUES (_gift_id, _sender_id, _receiver_id, _message);
  
  RETURN jsonb_build_object('success', true, 'remaining_points', _sender_points - _gift_price);
END;
$function$;

-- Update award_milestone function
CREATE OR REPLACE FUNCTION public.award_milestone(_user_id uuid, _milestone_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.relationship_milestones (user_id, milestone_type)
  VALUES (_user_id, _milestone_type)
  ON CONFLICT (user_id, milestone_type) DO NOTHING;
END;
$function$;

-- Create atomic daily bonus claim function
CREATE OR REPLACE FUNCTION public.claim_daily_bonus()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _user_id UUID := auth.uid();
  _last_bonus TIMESTAMP WITH TIME ZONE;
  _bonus_points INTEGER := 10;
BEGIN
  -- Get last bonus timestamp with row lock
  SELECT last_daily_bonus INTO _last_bonus
  FROM public.user_points
  WHERE user_id = _user_id
  FOR UPDATE;
  
  -- Check if eligible (NULL or more than 24 hours ago)
  IF _last_bonus IS NULL OR _last_bonus < now() - interval '24 hours' THEN
    -- Award points and update timestamp atomically
    INSERT INTO public.user_points (user_id, total_points, last_daily_bonus)
    VALUES (_user_id, _bonus_points, now())
    ON CONFLICT (user_id)
    DO UPDATE SET 
      total_points = user_points.total_points + _bonus_points,
      last_daily_bonus = now(),
      updated_at = now();
    
    -- Log transaction
    INSERT INTO public.point_transactions (user_id, points, action, description)
    VALUES (_user_id, _bonus_points, 'daily_bonus', 'Daily login bonus');
    
    RETURN jsonb_build_object('success', true, 'points_awarded', _bonus_points);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Daily bonus already claimed');
  END IF;
END;
$function$;