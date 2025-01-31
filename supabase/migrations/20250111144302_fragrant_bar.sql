/*
  # YouTube API Integration Update

  1. Functions
    - `fetch_youtube_channel_data`: YouTube APIからチャンネルデータを取得
    - `fetch_youtube_videos_data`: YouTube APIから動画リストを取得
*/

-- Create function to fetch YouTube channel data
CREATE OR REPLACE FUNCTION public.fetch_youtube_channel_data(
  channel_url text,
  api_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url text;
  channel_id text;
  api_response jsonb;
BEGIN
  -- チャンネルURLからチャンネルIDを抽出
  channel_id := regexp_replace(channel_url, '^.*/(channel/|c/|@)?([^/]+)/?$', '\2');
  
  -- YouTube Data API v3のエンドポイント
  api_url := format(
    'https://www.googleapis.com/youtube/v3/channels?id=%s&key=%s&part=snippet,statistics',
    channel_id,
    api_key
  );

  -- APIリクエストの実行（この部分は実際のHTTPリクエスト処理に置き換える必要があります）
  -- 現在はダミーデータを返します
  api_response := jsonb_build_object(
    'id', channel_id,
    'snippet', jsonb_build_object(
      'title', 'Sample Channel',
      'description', 'Sample Description',
      'thumbnails', jsonb_build_object(
        'default', jsonb_build_object(
          'url', 'https://example.com/channel-thumbnail.jpg'
        )
      )
    ),
    'statistics', jsonb_build_object(
      'subscriberCount', '0',
      'viewCount', '0',
      'videoCount', '0'
    )
  );

  RETURN api_response;
END;
$$;

-- Create function to fetch YouTube videos data
CREATE OR REPLACE FUNCTION public.fetch_youtube_videos_data(
  channel_url text,
  api_key text,
  max_results integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_url text;
  channel_id text;
  api_response jsonb;
BEGIN
  -- チャンネルURLからチャンネルIDを抽出
  channel_id := regexp_replace(channel_url, '^.*/(channel/|c/|@)?([^/]+)/?$', '\2');
  
  -- YouTube Data API v3のエンドポイント
  api_url := format(
    'https://www.googleapis.com/youtube/v3/search?channelId=%s&key=%s&part=snippet&order=date&type=video&maxResults=%s',
    channel_id,
    api_key,
    max_results
  );

  -- APIリクエストの実行（この部分は実際のHTTPリクエスト処理に置き換える必要があります）
  -- 現在はダミーデータを返します
  api_response := jsonb_build_array(
    jsonb_build_object(
      'id', gen_random_uuid(),
      'title', 'Sample Video 1',
      'description', 'Sample Description 1',
      'thumbnail', 'https://example.com/thumbnail1.jpg',
      'duration', 'PT10M30S',
      'viewCount', 1000,
      'genre', 'entertainment',
      'publishedAt', now()
    ),
    jsonb_build_object(
      'id', gen_random_uuid(),
      'title', 'Sample Video 2',
      'description', 'Sample Description 2',
      'thumbnail', 'https://example.com/thumbnail2.jpg',
      'duration', 'PT15M45S',
      'viewCount', 2000,
      'genre', 'education',
      'publishedAt', now() - interval '1 day'
    )
  );

  RETURN api_response;
END;
$$;