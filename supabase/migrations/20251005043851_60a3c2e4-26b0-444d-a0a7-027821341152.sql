-- Update remaining trigger functions with SET search_path

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, bio, age, interests)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text, 1, 8)),
    NEW.raw_user_meta_data->>'bio',
    (NEW.raw_user_meta_data->>'age')::integer,
    CASE 
      WHEN NEW.raw_user_meta_data->>'interests' IS NOT NULL 
      THEN string_to_array(NEW.raw_user_meta_data->>'interests', ',')
      ELSE NULL
    END
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_friend_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_sender_id UUID;
  v_receiver_id UUID;
BEGIN
  SELECT sender_id, receiver_id INTO v_sender_id, v_receiver_id
  FROM friend_requests
  WHERE id = request_id AND receiver_id = auth.uid();

  IF v_sender_id IS NULL THEN
    RAISE EXCEPTION 'Friend request not found or unauthorized';
  END IF;

  UPDATE friend_requests
  SET status = 'accepted', updated_at = NOW()
  WHERE id = request_id;

  INSERT INTO friends (user_id, friend_id)
  VALUES (v_sender_id, v_receiver_id), (v_receiver_id, v_sender_id)
  ON CONFLICT DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_post_likes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.posts
  SET likes_count = likes_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_post_likes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.posts
  SET likes_count = likes_count - 1
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_post_comments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.posts
  SET comments_count = comments_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrement_post_comments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.posts
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_user_points_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_first_friend_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF (SELECT COUNT(*) FROM friends WHERE user_id = NEW.user_id) = 1 THEN
    PERFORM award_milestone(NEW.user_id, 'first_friend');
  END IF;
  IF (SELECT COUNT(*) FROM friends WHERE user_id = NEW.friend_id) = 1 THEN
    PERFORM award_milestone(NEW.friend_id, 'first_friend');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.award_first_relationship_milestone()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    IF (SELECT COUNT(*) FROM relationships WHERE (user_id = NEW.user_id OR partner_id = NEW.user_id) AND status = 'accepted') = 1 THEN
      PERFORM award_milestone(NEW.user_id, 'first_relationship');
    END IF;
    IF (SELECT COUNT(*) FROM relationships WHERE (user_id = NEW.partner_id OR partner_id = NEW.partner_id) AND status = 'accepted') = 1 THEN
      PERFORM award_milestone(NEW.partner_id, 'first_relationship');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;