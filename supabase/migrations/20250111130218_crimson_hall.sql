/*
  # Fix YouTuber registration process

  1. Changes
    - Add error handling for profile creation
    - Improve role management
    - Add validation checks

  2. Security
    - Maintain existing RLS policies
    - Add additional validation
*/

-- Drop and recreate register_youtuber function with improved error handling
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
  profile_exists boolean;
  youtuber_id uuid;
BEGIN
  -- Check if profile exists
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id
  ) INTO profile_exists;

  -- Create profile if it doesn't exist
  IF NOT profile_exists THEN
    INSERT INTO public.profiles (
      id,
      username,
      role
    )
    VALUES (
      user_id,
      (SELECT split_part(email, '@', 1) FROM auth.users WHERE id = user_id),
      'user'
    );
  END IF;

  -- Update role to youtuber
  UPDATE public.profiles 
  SET 
    role = 'youtuber',
    updated_at = now()
  WHERE id = user_id
  AND auth.uid() = user_id;

  -- Create YouTuber profile with validation
  INSERT INTO public.youtuber_profiles (
    id,
    channel_name,
    channel_url,
    channel_description,
    category,
    verification_status
  )
  VALUES (
    user_id,
    channel_name,
    channel_url,
    channel_description,
    category,
    'pending'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    channel_name = EXCLUDED.channel_name,
    channel_url = EXCLUDED.channel_url,
    channel_description = EXCLUDED.channel_description,
    category = EXCLUDED.category,
    updated_at = now()
  RETURNING id INTO youtuber_id;

  -- Initialize or update channel stats
  INSERT INTO public.channel_stats (
    youtuber_id,
    subscriber_count,
    total_views,
    video_count
  )
  VALUES (
    youtuber_id,
    0, 0, 0
  )
  ON CONFLICT (youtuber_id) DO NOTHING;

  RETURN youtuber_id;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'YouTuber registration failed: %', SQLERRM;
END;
$$;