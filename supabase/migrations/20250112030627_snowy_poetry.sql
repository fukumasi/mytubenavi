-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS videos_updated_at ON public.videos;

-- Create videos table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.videos (
  id text PRIMARY KEY,
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS videos_youtuber_id_idx ON public.videos (youtuber_id);
CREATE INDEX IF NOT EXISTS videos_published_at_idx ON public.videos (published_at);
CREATE INDEX IF NOT EXISTS videos_title_idx ON public.videos USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS videos_description_idx ON public.videos USING gin(to_tsvector('simple', description));

-- Enable RLS if not already enabled
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Anyone can view videos" ON public.videos;

-- Create policy
CREATE POLICY "Anyone can view videos"
  ON public.videos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add trigger for updating updated_at
CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();