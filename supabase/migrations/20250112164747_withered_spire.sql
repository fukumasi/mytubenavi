-- Drop existing tables that reference videos
DROP TABLE IF EXISTS public.favorites CASCADE;
DROP TABLE IF EXISTS public.view_history CASCADE;
DROP TABLE IF EXISTS public.slot_bookings CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;

-- Recreate videos table with string ID
CREATE TABLE IF NOT EXISTS public.videos (
  id text PRIMARY KEY, -- Changed from uuid to text to match YouTube video IDs
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

-- Recreate indexes
CREATE INDEX IF NOT EXISTS videos_youtuber_id_idx ON public.videos (youtuber_id);
CREATE INDEX IF NOT EXISTS videos_published_at_idx ON public.videos (published_at);
CREATE INDEX IF NOT EXISTS videos_title_idx ON public.videos USING gin(to_tsvector('simple', title));
CREATE INDEX IF NOT EXISTS videos_description_idx ON public.videos USING gin(to_tsvector('simple', description));

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Anyone can view videos"
  ON public.videos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Recreate favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id text REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- Recreate view_history table
CREATE TABLE IF NOT EXISTS public.view_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id text REFERENCES public.videos(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Recreate slot_bookings table
CREATE TABLE IF NOT EXISTS public.slot_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES public.promotion_slots(id) ON DELETE RESTRICT,
  video_id text REFERENCES public.videos(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  status text NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  total_price integer NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add triggers for updating updated_at
CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER favorites_updated_at
  BEFORE UPDATE ON public.favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER view_history_updated_at
  BEFORE UPDATE ON public.view_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER slot_bookings_updated_at
  BEFORE UPDATE ON public.slot_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();