-- Add caption and music_url columns to stories table
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS caption TEXT,
ADD COLUMN IF NOT EXISTS music_url TEXT;