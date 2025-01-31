-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view videos" ON public.videos;

-- Create new policies for videos table
CREATE POLICY "Anyone can view videos"
  ON public.videos
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow authenticated users to insert videos
CREATE POLICY "Authenticated users can insert videos"
  ON public.videos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow authenticated users to update videos
CREATE POLICY "Authenticated users can update videos"
  ON public.videos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow system to delete videos
CREATE POLICY "System can delete videos"
  ON public.videos
  FOR DELETE
  TO authenticated
  USING (true);