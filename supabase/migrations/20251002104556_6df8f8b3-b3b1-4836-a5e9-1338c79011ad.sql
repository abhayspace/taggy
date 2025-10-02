-- Create story_likes table
CREATE TABLE public.story_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Create story_comments table
CREATE TABLE public.story_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for story_likes
CREATE POLICY "Users can like stories they can view"
  ON public.story_likes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id AND can_view_post(user_id)
    )
  );

CREATE POLICY "Users can unlike stories"
  ON public.story_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view likes on viewable stories"
  ON public.story_likes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id AND can_view_post(user_id)
    )
  );

-- RLS policies for story_comments
CREATE POLICY "Users can comment on stories they can view"
  ON public.story_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id AND can_view_post(user_id)
    )
  );

CREATE POLICY "Users can view comments on viewable stories"
  ON public.story_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.stories
      WHERE id = story_id AND can_view_post(user_id)
    )
  );

CREATE POLICY "Users can delete their own comments"
  ON public.story_comments FOR DELETE
  USING (auth.uid() = user_id);