-- Drop existing indexes
DROP INDEX IF EXISTS videos_description_idx;
DROP INDEX IF EXISTS videos_title_idx;

-- Create new optimized indexes using GIN with tsvector
CREATE INDEX videos_title_tsvector_idx ON public.videos USING GIN (to_tsvector('english', title));
CREATE INDEX videos_description_tsvector_idx ON public.videos USING GIN (to_tsvector('english', LEFT(description, 1000)));

-- Add column for search vector
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS search_vector tsvector;
CREATE INDEX videos_search_idx ON public.videos USING GIN (search_vector);

-- Create function to update search vector
CREATE OR REPLACE FUNCTION videos_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(LEFT(NEW.description, 1000), '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update search vector
DROP TRIGGER IF EXISTS videos_search_vector_update ON public.videos;
CREATE TRIGGER videos_search_vector_update
  BEFORE INSERT OR UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION videos_search_vector_update();

-- Update existing records
UPDATE public.videos SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(LEFT(description, 1000), '')), 'B');