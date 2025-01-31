-- First, drop existing policies and triggers
DO $$ 
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Anyone can view videos" ON public.videos;
  DROP POLICY IF EXISTS "Users can view own history" ON public.view_history;
  DROP POLICY IF EXISTS "Users can add to own history" ON public.view_history;

  -- Drop existing triggers
  DROP TRIGGER IF EXISTS videos_updated_at ON public.videos;
  DROP TRIGGER IF EXISTS view_history_updated_at ON public.view_history;
END $$;

-- Drop tables with CASCADE to handle dependencies
DROP TABLE IF EXISTS public.view_history CASCADE;
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;

-- Recreate videos table with UUID primary key
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtuber_id uuid REFERENCES public.youtuber_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  thumbnail text,
  duration text,
  view_count integer DEFAULT 0,
  rating numeric(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  genre text,
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create view_history table with proper foreign key reference
CREATE TABLE IF NOT EXISTS public.view_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS videos_youtuber_id_idx ON public.videos (youtuber_id);
CREATE INDEX IF NOT EXISTS videos_published_at_idx ON public.videos (published_at);
CREATE INDEX IF NOT EXISTS videos_title_idx ON public.videos USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS videos_description_idx ON public.videos USING gin(to_tsvector('simple', description));

CREATE INDEX IF NOT EXISTS view_history_user_id_idx ON public.view_history (user_id);
CREATE INDEX IF NOT EXISTS view_history_video_id_idx ON public.view_history (video_id);
CREATE INDEX IF NOT EXISTS view_history_viewed_at_idx ON public.view_history (viewed_at);

CREATE INDEX IF NOT EXISTS favorites_user_video_idx ON public.favorites (user_id, video_id);
CREATE INDEX IF NOT EXISTS favorites_video_id_idx ON public.favorites (video_id);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Create new policies
CREATE POLICY "Anyone can view videos"
  ON public.videos
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Users can view own history"
  ON public.view_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own history"
  ON public.view_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own favorites"
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own favorites"
  ON public.favorites
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- Add triggers for updating updated_at
CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER view_history_updated_at
  BEFORE UPDATE ON public.view_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER favorites_updated_at
  BEFORE UPDATE ON public.favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();