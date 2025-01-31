/*
  # 検索機能のCASE式の型エラー修正

  1. 変更内容
    - ORDER BY句のCASE式の型不一致を修正
    - ソート順の優先順位を明確化
    - パフォーマンスの最適化

  2. 主な改善点
    - 型の一貫性を確保
    - NULLの扱いを明確化
    - インデックスの活用を考慮
*/

-- Drop existing search function
DROP FUNCTION IF EXISTS public.search_videos;

-- Create improved search function with type-safe sorting
CREATE OR REPLACE FUNCTION public.search_videos(
  search_query text,
  genre_filter text DEFAULT NULL,
  page_number integer DEFAULT 1,
  items_per_page integer DEFAULT 10,
  sort_by text DEFAULT 'relevance'
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
      COUNT(*) OVER() as full_count,
      -- Calculate relevance score
      CASE
        WHEN v.title ILIKE '%' || search_query || '%' THEN 3
        WHEN v.description ILIKE '%' || search_query || '%' THEN 2
        WHEN yp.channel_name ILIKE '%' || search_query || '%' THEN 1
        ELSE 0
      END as relevance_score,
      -- Calculate sort values with consistent types
      CASE sort_by
        WHEN 'date' THEN extract(epoch from v.published_at)
        WHEN 'rating' THEN v.rating::float8
        WHEN 'views' THEN v.view_count::float8
        ELSE 0::float8
      END as sort_value
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
  )
  SELECT 
    filtered_videos.id,
    filtered_videos.title,
    filtered_videos.description,
    filtered_videos.thumbnail,
    filtered_videos.duration,
    filtered_videos.view_count,
    filtered_videos.rating,
    filtered_videos.published_at,
    filtered_videos.channel_name,
    filtered_videos.channel_url,
    filtered_videos.verification_status,
    filtered_videos.full_count
  FROM filtered_videos
  ORDER BY
    CASE sort_by
      WHEN 'relevance' THEN filtered_videos.relevance_score
      ELSE 0
    END DESC,
    CASE 
      WHEN sort_by != 'relevance' THEN filtered_videos.sort_value
      ELSE extract(epoch from filtered_videos.published_at)
    END DESC NULLS LAST;
END;
$$;