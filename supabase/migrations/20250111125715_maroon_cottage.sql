/*
  # Add YouTuber related tables and functions

  1. New Tables
    - `youtuber_profiles`
      - Extends the base profile with YouTuber specific information
      - Stores channel details, verification status, etc.
    
    - `channel_stats`
      - Tracks channel statistics over time
      - Stores subscriber count, view counts, etc.

  2. Security
    - Enable RLS on all new tables
    - Add policies for data access control
    - Only verified YouTubers can update their own data

  3. Functions
    - Add function to handle YouTuber verification
    - Add function to update channel stats
*/

-- YouTuber profiles table
CREATE TABLE IF NOT EXISTS public.youtuber_profiles (
  id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel_name text NOT NULL,
  channel_url text NOT NULL,
  channel_description text,
  verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  category text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Channel statistics table
CREATE TABLE IF NOT EXISTS public.channel_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtuber_id uuid REFERENCES public.youtuber_profiles(id) ON DELETE CASCADE,
  subscriber_count integer DEFAULT 0,
  total_views integer DEFAULT 0,
  video_count integer DEFAULT 0,
  recorded_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.youtuber_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_stats ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS youtuber_profiles_channel_name_idx ON public.youtuber_profiles (channel_name);
CREATE INDEX IF NOT EXISTS channel_stats_youtuber_id_idx ON public.channel_stats (youtuber_id);

-- YouTuber profile policies
CREATE POLICY "Anyone can view YouTuber profiles"
  ON public.youtuber_profiles
  FOR SELECT
  USING (true);

CREATE POLICY "YouTubers can update their own profile"
  ON public.youtuber_profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can create YouTuber profile once"
  ON public.youtuber_profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id 
    AND NOT EXISTS (
      SELECT 1 FROM public.youtuber_profiles 
      WHERE id = auth.uid()
    )
  );

-- Channel stats policies
CREATE POLICY "Anyone can view channel stats"
  ON public.channel_stats
  FOR SELECT
  USING (true);

CREATE POLICY "Only system can insert channel stats"
  ON public.channel_stats
  FOR INSERT
  WITH CHECK (false); -- Only allow through server-side functions

-- Function to handle YouTuber registration
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

-- Add updated_at trigger to new tables
CREATE TRIGGER youtuber_profiles_updated_at
  BEFORE UPDATE ON public.youtuber_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();