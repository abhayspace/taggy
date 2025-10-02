-- Add display_name column to profiles table
ALTER TABLE public.profiles
ADD COLUMN display_name TEXT;

-- Migrate existing username values to display_name for existing users
UPDATE public.profiles
SET display_name = username
WHERE display_name IS NULL;

-- Update the handle_new_user function to populate both username and display_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;