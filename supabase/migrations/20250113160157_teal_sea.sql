-- First drop the existing policy if it exists
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;

-- Then create the policy
CREATE POLICY "Anyone can read reviews"
  ON public.reviews
  FOR SELECT
  TO anon, authenticated
  USING (true);