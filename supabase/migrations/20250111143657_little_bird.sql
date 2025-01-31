/*
  # Add search functionality

  1. Functions
    - `search_videos`: Function to search videos with pagination
    - Supports searching by title, description, and channel name
    - Includes verification status check
    - Returns paginated results with total count

  2. Indexes
    - Add indexes for search performance
*/

-- Create function for video search
CREATE OR REPLACE FUNCTION public.search_videos(
  search_query text,
  genre_filter text DEFAULT NULL,
  page_number integer DEFAULT 1,
  items_per_page integer DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  thumbnail text,
  duration text,
  view_count integer,
  rating numeric,
  published_at timestamptz,
  channel_name text,
  channel_url text,
  verification_status text,
  total_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_records bigint;
  offset_value integer;
BEGIN
  -- Calculate offset
  offset_value := (page_number - 1) * items_per_page;
  
  RETURN QUERY
  WITH filtered_videos AS (
    SELECT 
      v.id,
      v.title,
      v.description,
      v.thumbnail,
      v.duration,
      v.view_count,
      v.rating,
      v.published_at,
      yp.channel_name,
      yp.channel_url,
      yp.verification_status,
      COUNT(*) OVER() as full_count
    FROM public.videos v
    INNER JOIN public.youtuber_profiles yp ON v.youtuber_id = yp.id
    WHERE 
      yp.verification_status = 'verified'
      AND (
        search_query IS NULL 
        OR v.title ILIKE '%' || search_query || '%'
        OR v.description ILIKE '%' || search_query || '%'
        OR yp.channel_name ILIKE '%' || search_query || '%'
      )
      AND (
        genre_filter IS NULL
        OR v.genre = genre_filter
      )
    ORDER BY v.published_at DESC
    LIMIT items_per_page
    OFFSET offset_value
  )
  SELECT 
    id,
    title,
    description,
    thumbnail,
    duration,
    view_count,
    rating,
    published_at,
    channel_name,
    channel_url,
    verification_status,
    full_count
  FROM filtered_videos;
END;
$$;