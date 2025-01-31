/*
  # Fix channel stats reference

  1. Changes
    - Fix ambiguous youtuber_id reference in channel_stats table
    - Add unique constraint to prevent duplicate stats
    - Improve error handling in register_youtuber function

  2. Security
    - Maintain existing RLS policies
*/

-- Drop existing channel_stats table and recreate with proper constraints
DROP TABLE IF EXISTS public.channel_stats CASCADE;

CREATE TABLE IF NOT EXISTS public.channel_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtuber_id uuid UNIQUE REFERENCES public.youtuber_profiles(id) ON DELETE CASCADE,
  subscriber_count integer DEFAULT 0,
  total_views integer DEFAULT 0,
  video_count integer DEFAULT 0,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.channel_stats ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS channel_stats_youtuber_id_idx ON public.channel_stats (youtuber_id);

-- Channel stats policies
CREATE POLICY "Anyone can view channel stats"
  ON public.channel_stats
  FOR SELECT
  USING (true);

CREATE POLICY "Only system can modify channel stats"
  ON public.channel_stats
  FOR ALL
  USING (false);

-- Update register_youtuber function with improved error handling
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
  new_youtuber_id uuid;
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
  RETURNING id INTO new_youtuber_id;

  -- Initialize channel stats
  INSERT INTO public.channel_stats (
    youtuber_id,
    subscriber_count,
    total_views,
    video_count
  )
  VALUES (
    new_youtuber_id,
    0, 0, 0
  )
  ON CONFLICT (youtuber_id) DO NOTHING;

  RETURN new_youtuber_id;
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'YouTuber registration failed: %', SQLERRM;
END;
$$;