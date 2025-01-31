/*
  # 検索機能の改善

  1. 変更内容
    - 全文検索を使用せず、ILIKE による単純な文字列マッチングに変更
    - ソート機能の構文エラーを修正
    - より効率的な並び替え処理の実装

  2. 主な改善点
    - 日本語全文検索の依存を削除
    - より安定したソート処理
    - パフォーマンスの改善
*/

-- Drop existing search function
DROP FUNCTION IF EXISTS public.search_videos;

-- Create improved search function without full text search
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
  FROM filtered_videos
  ORDER BY
    CASE sort_by
      WHEN 'date' THEN published_at
      WHEN 'rating' THEN rating
      WHEN 'views' THEN view_count
      ELSE
        CASE
          WHEN title ILIKE '%' || search_query || '%' THEN 0
          WHEN description ILIKE '%' || search_query || '%' THEN 1
          ELSE 2
        END
    END DESC NULLS LAST,
    published_at DESC;
END;
$$;