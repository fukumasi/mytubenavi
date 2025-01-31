-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can update videos" ON public.videos;
DROP POLICY IF EXISTS "System can delete videos" ON public.videos;

-- Create new policies with proper security
CREATE POLICY "Enable read access for all users"
  ON public.videos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert access for service role"
  ON public.videos
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Enable insert access for authenticated users"
  ON public.videos
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update access for service role"
  ON public.videos
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
  ON public.videos
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete access for service role"
  ON public.videos
  FOR DELETE
  TO service_role
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE public.videos FORCE ROW LEVEL SECURITY;