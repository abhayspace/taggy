-- Phase 1: Create security definer function to check friendship or self
CREATE OR REPLACE FUNCTION public.is_friend_or_self(_user_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = _profile_id OR EXISTS (
    SELECT 1 FROM public.friends 
    WHERE user_id = _user_id AND friend_id = _profile_id
  )
$$;

-- Phase 2: Create function to check if user can view posts
CREATE OR REPLACE FUNCTION public.can_view_post(_post_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _post_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.friends 
    WHERE user_id = auth.uid() AND friend_id = _post_user_id
  )
$$;

-- Update profiles policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

CREATE POLICY "Users can view own profile and friends' profiles"
ON profiles FOR SELECT
TO authenticated
USING (public.is_friend_or_self(auth.uid(), id));

-- Update posts policy
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;

CREATE POLICY "Users can view own posts and friends' posts"
ON posts FOR SELECT
TO authenticated
USING (public.can_view_post(user_id));

-- Update stories policy
DROP POLICY IF EXISTS "Active stories are viewable by everyone" ON stories;

CREATE POLICY "Users can view own stories and friends' active stories"
ON stories FOR SELECT
TO authenticated
USING (
  expires_at > now() AND 
  public.can_view_post(user_id)
);

-- Update post_likes policy
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON post_likes;

CREATE POLICY "Users can view likes on viewable posts"
ON post_likes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM posts 
    WHERE posts.id = post_likes.post_id 
    AND public.can_view_post(posts.user_id)
  )
);