/*
  # YouTube API Integration

  1. New Tables
    - `youtube_api_tokens`
      - Stores OAuth tokens for YouTuber accounts
    - `youtube_sync_logs`
      - Tracks API sync history and errors
  
  2. Functions
    - `sync_youtube_channel`
      - Syncs channel data from YouTube API
    - `sync_youtube_videos`
      - Syncs video data from YouTube API
*/

-- YouTube API tokens table
CREATE TABLE IF NOT EXISTS public.youtube_api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtuber_id uuid REFERENCES public.youtuber_profiles(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- YouTube sync logs table
CREATE TABLE IF NOT EXISTS public.youtube_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtuber_id uuid REFERENCES public.youtuber_profiles(id) ON DELETE CASCADE,
  sync_type text NOT NULL CHECK (sync_type IN ('channel', 'videos', 'statistics')),
  status text NOT NULL CHECK (status IN ('success', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.youtube_api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.youtube_sync_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS youtube_api_tokens_youtuber_id_idx ON public.youtube_api_tokens (youtuber_id);
CREATE INDEX IF NOT EXISTS youtube_sync_logs_youtuber_id_idx ON public.youtube_sync_logs (youtuber_id);
CREATE INDEX IF NOT EXISTS youtube_sync_logs_created_at_idx ON public.youtube_sync_logs (created_at);

-- Add triggers for updated_at
CREATE TRIGGER youtube_api_tokens_updated_at
  BEFORE UPDATE ON public.youtube_api_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Add genre column to videos table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' 
    AND column_name = 'genre'
  ) THEN
    ALTER TABLE public.videos 
    ADD COLUMN genre text;
  END IF;
END $$;

-- Create function to sync YouTube channel data
CREATE OR REPLACE FUNCTION public.sync_youtube_channel(
  youtuber_id uuid,
  channel_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update channel statistics
  UPDATE public.channel_stats
  SET
    subscriber_count = (channel_data->>'subscriberCount')::integer,
    total_views = (channel_data->>'viewCount')::integer,
    video_count = (channel_data->>'videoCount')::integer,
    recorded_at = now(),
    updated_at = now()
  WHERE youtuber_id = sync_youtube_channel.youtuber_id;

  -- Log successful sync
  INSERT INTO public.youtube_sync_logs (
    youtuber_id,
    sync_type,
    status
  ) VALUES (
    sync_youtube_channel.youtuber_id,
    'channel',
    'success'
  );
EXCEPTION
  WHEN others THEN
    -- Log error
    INSERT INTO public.youtube_sync_logs (
      youtuber_id,
      sync_type,
      status,
      error_message
    ) VALUES (
      sync_youtube_channel.youtuber_id,
      'channel',
      'error',
      SQLERRM
    );
    RAISE EXCEPTION 'Channel sync failed: %', SQLERRM;
END;
$$;

-- Create function to sync YouTube videos
CREATE OR REPLACE FUNCTION public.sync_youtube_videos(
  youtuber_id uuid,
  videos_data jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  video_data jsonb;
BEGIN
  -- Process each video
  FOR video_data IN SELECT * FROM jsonb_array_elements(videos_data)
  LOOP
    -- Insert or update video
    INSERT INTO public.videos (
      id,
      youtuber_id,
      title,
      description,
      thumbnail,
      duration,
      view_count,
      genre,
      published_at
    ) VALUES (
      (video_data->>'id')::uuid,
      sync_youtube_videos.youtuber_id,
      video_data->>'title',
      video_data->>'description',
      video_data->>'thumbnail',
      video_data->>'duration',
      (video_data->>'viewCount')::integer,
      video_data->>'genre',
      (video_data->>'publishedAt')::timestamptz
    )
    ON CONFLICT (id) DO UPDATE
    SET
      title = EXCLUDED.title,
      description = EXCLUDED.description,
      thumbnail = EXCLUDED.thumbnail,
      duration = EXCLUDED.duration,
      view_count = EXCLUDED.view_count,
      genre = EXCLUDED.genre,
      updated_at = now();
  END LOOP;

  -- Log successful sync
  INSERT INTO public.youtube_sync_logs (
    youtuber_id,
    sync_type,
    status
  ) VALUES (
    sync_youtube_videos.youtuber_id,
    'videos',
    'success'
  );
EXCEPTION
  WHEN others THEN
    -- Log error
    INSERT INTO public.youtube_sync_logs (
      youtuber_id,
      sync_type,
      status,
      error_message
    ) VALUES (
      sync_youtube_videos.youtuber_id,
      'videos',
      'error',
      SQLERRM
    );
    RAISE EXCEPTION 'Videos sync failed: %', SQLERRM;
END;
$$;