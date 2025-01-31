-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can insert videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can update own videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can delete own videos" ON public.videos;

-- Create new simplified policies
CREATE POLICY "Enable read access for all users"
  ON public.videos
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for all users"
  ON public.videos
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update for all users"
  ON public.videos
  FOR UPDATE
  TO public
  USING (true);

-- Ensure RLS is enabled but with proper access
ALTER TABLE public.videos FORCE ROW LEVEL SECURITY;