-- Safely update videos table structure and policies
DO $$ 
BEGIN
  -- First, recreate the videos table with correct structure if needed
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'videos' 
    AND column_name = 'id' 
    AND data_type != 'text'
  ) THEN
    -- Create temporary table
    CREATE TABLE videos_new (
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

    -- Copy data if any exists
    INSERT INTO videos_new
    SELECT * FROM videos;

    -- Drop old table and rename new one
    DROP TABLE videos CASCADE;
    ALTER TABLE videos_new RENAME TO videos;
  END IF;

  -- Recreate indexes
  DROP INDEX IF EXISTS videos_youtuber_id_idx;
  DROP INDEX IF EXISTS videos_published_at_idx;
  DROP INDEX IF EXISTS videos_title_idx;
  DROP INDEX IF EXISTS videos_description_idx;

  CREATE INDEX videos_youtuber_id_idx ON public.videos (youtuber_id);
  CREATE INDEX videos_published_at_idx ON public.videos (published_at);
  CREATE INDEX videos_title_idx ON public.videos (title);
  CREATE INDEX videos_description_idx ON public.videos (description);

  -- Enable RLS
  ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Enable read access for all users" ON public.videos;
  DROP POLICY IF EXISTS "Enable insert access for service role" ON public.videos;
  DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.videos;
  DROP POLICY IF EXISTS "Enable update access for service role" ON public.videos;
  DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.videos;
  DROP POLICY IF EXISTS "Enable delete access for service role" ON public.videos;
  DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.videos;

  -- Create new policies
  CREATE POLICY "Anyone can view videos"
    ON public.videos
    FOR SELECT
    TO public
    USING (true);

  CREATE POLICY "Authenticated users can insert videos"
    ON public.videos
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

  CREATE POLICY "Authenticated users can update own videos"
    ON public.videos
    FOR UPDATE
    TO authenticated
    USING (youtuber_id IN (
      SELECT id FROM public.youtuber_profiles
      WHERE id = auth.uid()
    ));

  CREATE POLICY "Authenticated users can delete own videos"
    ON public.videos
    FOR DELETE
    TO authenticated
    USING (youtuber_id IN (
      SELECT id FROM public.youtuber_profiles
      WHERE id = auth.uid()
    ));

END $$;