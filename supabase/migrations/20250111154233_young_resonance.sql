/*
  # 検索機能の修正

  1. 変更内容
    - カラム参照の曖昧性を解消
    - ソート処理の構文を修正
    - パフォーマンスの改善

  2. 主な改善点
    - テーブルエイリアスを明示的に指定
    - ORDER BY句の構文エラーを修正
    - インデックスを活用しやすい構造に変更
*/

-- Drop existing search function
DROP FUNCTION IF EXISTS public.search_videos;

-- Create improved search function
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
      WHEN 'date' THEN filtered_videos.published_at
      WHEN 'rating' THEN filtered_videos.rating
      WHEN 'views' THEN filtered_videos.view_count
      ELSE
        CASE
          WHEN filtered_videos.title ILIKE '%' || search_query || '%' THEN 0
          WHEN filtered_videos.description ILIKE '%' || search_query || '%' THEN 1
          ELSE 2
        END
    END DESC NULLS LAST,
    filtered_videos.published_at DESC
  LIMIT items_per_page
  OFFSET offset_value;
END;
$$;