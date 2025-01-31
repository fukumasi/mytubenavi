-- Update videos table structure safely
DO $$ 
BEGIN
  -- Check if we need to alter the column type
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

    -- Recreate indexes
    CREATE INDEX IF NOT EXISTS videos_youtuber_id_idx ON public.videos (youtuber_id);
    CREATE INDEX IF NOT EXISTS videos_published_at_idx ON public.videos (published_at);
    CREATE INDEX videos_title_idx ON public.videos (title);
    CREATE INDEX videos_description_idx ON public.videos (description);

    -- Enable RLS
    ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;