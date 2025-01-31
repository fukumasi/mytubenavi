/*
  # YouTube API Integration Update

  1. Functions
    - `fetch_youtube_video_data`: YouTube APIから動画データを取得
    - `update_video_statistics`: 動画の統計情報を更新
    - `sync_youtube_data`: 定期的な同期処理を実行
*/

-- Create function to fetch YouTube video data
CREATE OR REPLACE FUNCTION public.fetch_youtube_video_data(
  video_id text,
  api_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url text;
  api_response jsonb;
BEGIN
  -- YouTube Data API v3のエンドポイント
  api_url := format(
    'https://www.googleapis.com/youtube/v3/videos?id=%s&key=%s&part=snippet,statistics,contentDetails',
    video_id,
    api_key
  );

  -- APIリクエストの実行（この部分は実際のHTTPリクエスト処理に置き換える必要があります）
  -- 現在はダミーデータを返します
  api_response := jsonb_build_object(
    'id', video_id,
    'snippet', jsonb_build_object(
      'title', 'Sample Video',
      'description', 'Sample Description',
      'thumbnails', jsonb_build_object(
        'default', jsonb_build_object(
          'url', 'https://example.com/thumbnail.jpg'
        )
      ),
      'publishedAt', now()
    ),
    'statistics', jsonb_build_object(
      'viewCount', '0',
      'likeCount', '0',
      'commentCount', '0'
    ),
    'contentDetails', jsonb_build_object(
      'duration', 'PT0M0S'
    )
  );

  RETURN api_response;
END;
$$;

-- Create function to update video statistics
CREATE OR REPLACE FUNCTION public.update_video_statistics(
  video_id uuid,
  view_count integer,
  like_count integer,
  comment_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.videos
  SET
    view_count = update_video_statistics.view_count,
    like_count = update_video_statistics.like_count,
    comment_count = update_video_statistics.comment_count,
    updated_at = now()
  WHERE id = video_id;

  -- Log the update
  INSERT INTO public.youtube_sync_logs (
    youtuber_id,
    sync_type,
    status
  )
  SELECT
    youtuber_id,
    'statistics',
    'success'
  FROM public.videos
  WHERE id = video_id;
EXCEPTION
  WHEN others THEN
    -- Log error
    INSERT INTO public.youtube_sync_logs (
      youtuber_id,
      sync_type,
      status,
      error_message
    )
    SELECT
      youtuber_id,
      'statistics',
      'error',
      SQLERRM
    FROM public.videos
    WHERE id = video_id;
    
    RAISE EXCEPTION 'Statistics update failed: %', SQLERRM;
END;
$$;

-- Create function to sync YouTube data periodically
CREATE OR REPLACE FUNCTION public.sync_youtube_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  youtuber record;
  api_key text;
BEGIN
  -- 環境変数からAPI keyを取得（実際の実装では適切な方法で管理する必要があります）
  api_key := current_setting('app.youtube_api_key', true);
  
  -- 認証済みのYouTuberのデータを同期
  FOR youtuber IN
    SELECT id, channel_url
    FROM public.youtuber_profiles
    WHERE verification_status = 'verified'
  LOOP
    -- チャンネルデータの同期
    PERFORM public.sync_youtube_channel(
      youtuber.id,
      public.fetch_youtube_channel_data(youtuber.channel_url, api_key)
    );
    
    -- 動画データの同期
    PERFORM public.sync_youtube_videos(
      youtuber.id,
      public.fetch_youtube_videos_data(youtuber.channel_url, api_key)
    );
  END LOOP;
END;
$$;