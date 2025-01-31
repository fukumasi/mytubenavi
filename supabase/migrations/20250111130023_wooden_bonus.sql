/*
  # Fix YouTuber registration process

  1. Changes
    - Modify handle_new_user trigger to ensure profile creation
    - Update register_youtuber function to handle profile creation if needed
    - Add error handling and validation

  2. Security
    - Maintain RLS policies
    - Ensure proper authorization checks
*/

-- Drop and recreate handle_new_user function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    role
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      split_part(NEW.email, '@', 1)
    ),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ language plpgsql;

-- Update register_youtuber function with profile check
CREATE OR REPLACE FUNCTION public.register_youtuber(
  user_id uuid,
  channel_name text,
  channel_url text,
  channel_description text,
  category text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  youtuber_id uuid;
BEGIN
  -- Ensure profile exists
  INSERT INTO public.profiles (
    id,
    username,
    role
  )
  VALUES (
    user_id,
    (SELECT split_part(email, '@', 1) FROM auth.users WHERE id = user_id),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Update the user's profile role
  UPDATE public.profiles 
  SET role = 'youtuber'
  WHERE id = user_id
  AND auth.uid() = user_id;

  -- Create YouTuber profile
  INSERT INTO public.youtuber_profiles (
    id,
    channel_name,
    channel_url,
    channel_description,
    category
  )
  VALUES (
    user_id,
    channel_name,
    channel_url,
    channel_description,
    category
  )
  RETURNING id INTO youtuber_id;

  -- Initialize channel stats
  INSERT INTO public.channel_stats (
    youtuber_id,
    subscriber_count,
    total_views,
    video_count
  )
  VALUES (
    youtuber_id,
    0, 0, 0
  );

  RETURN youtuber_id;
END;
$$;