-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.videos;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.videos;
DROP POLICY IF EXISTS "Enable update for all users" ON public.videos;

-- Create new policies with better security
CREATE POLICY "Anyone can read videos"
  ON public.videos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can insert videos"
  ON public.videos
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update videos"
  ON public.videos
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Add channel_title column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' 
    AND column_name = 'channel_title'
  ) THEN
    ALTER TABLE public.videos ADD COLUMN channel_title text;
  END IF;
END $$;