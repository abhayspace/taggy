-- Functions to maintain posts.comments_count
CREATE OR REPLACE FUNCTION public.increment_post_comments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = comments_count + 1
  WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_post_comments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.posts
  SET comments_count = GREATEST(comments_count - 1, 0)
  WHERE id = OLD.post_id;
  RETURN OLD;
END;
$$;

-- Triggers on post_comments
DROP TRIGGER IF EXISTS trg_increment_post_comments ON public.post_comments;
CREATE TRIGGER trg_increment_post_comments
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.increment_post_comments();

DROP TRIGGER IF EXISTS trg_decrement_post_comments ON public.post_comments;
CREATE TRIGGER trg_decrement_post_comments
AFTER DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.decrement_post_comments();