-- First migration: Drop existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.videos;
DROP POLICY IF EXISTS "Enable insert access for service role" ON public.videos;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.videos;
DROP POLICY IF EXISTS "Enable update access for service role" ON public.videos;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.videos;
DROP POLICY IF EXISTS "Enable delete access for service role" ON public.videos;