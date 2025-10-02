-- Add gender field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say'));

-- Make posts.image_url nullable to support text-only posts
ALTER TABLE public.posts 
ALTER COLUMN image_url DROP NOT NULL;