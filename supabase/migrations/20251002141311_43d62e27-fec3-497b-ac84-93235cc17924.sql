-- Add music_url column to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS music_url TEXT;

-- Add secret_code column to relationships table for relationship confirmation
ALTER TABLE public.relationships
ADD COLUMN IF NOT EXISTS secret_code TEXT;