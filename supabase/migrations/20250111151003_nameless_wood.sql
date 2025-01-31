/*
  # Add sample data for testing

  1. New Data
    - Sample auth users
    - Sample YouTuber profiles
    - Sample videos with various genres
    - Sample channel statistics
  
  2. Changes
    - Insert test data for development and testing
*/

-- First, create auth users
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
VALUES 
  (
    'd0d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0a',
    'music@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now()
  ),
  (
    'd1d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0b',
    'gaming@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now()
  ),
  (
    'd2d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0c',
    'tech@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample profiles
INSERT INTO public.profiles (id, username, role)
VALUES 
  ('d0d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0a', 'music_channel', 'youtuber'),
  ('d1d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0b', 'gaming_channel', 'youtuber'),
  ('d2d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0c', 'tech_channel', 'youtuber')
ON CONFLICT (id) DO NOTHING;

-- Insert sample YouTuber profiles
INSERT INTO public.youtuber_profiles (
  id,
  channel_name,
  channel_url,
  channel_description,
  verification_status,
  category
)
VALUES 
  (
    'd0d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0a',
    'Music Channel',
    'https://youtube.com/@music_channel',
    'The best music channel for covers and originals',
    'verified',
    'music'
  ),
  (
    'd1d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0b',
    'Gaming Channel',
    'https://youtube.com/@gaming_channel',
    'Gaming news, reviews, and playthroughs',
    'verified',
    'gaming'
  ),
  (
    'd2d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0c',
    'Tech Channel',
    'https://youtube.com/@tech_channel',
    'Latest tech news and reviews',
    'verified',
    'tech'
  )
ON CONFLICT (id) DO NOTHING;

-- Insert sample channel statistics
INSERT INTO public.channel_stats (
  youtuber_id,
  subscriber_count,
  total_views,
  video_count
)
VALUES 
  ('d0d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0a', 100000, 1000000, 50),
  ('d1d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0b', 200000, 2000000, 100),
  ('d2d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0c', 150000, 1500000, 75)
ON CONFLICT (youtuber_id) DO NOTHING;

-- Insert sample videos
INSERT INTO public.videos (
  id,
  youtuber_id,
  title,
  description,
  thumbnail,
  duration,
  view_count,
  rating,
  genre,
  published_at
)
VALUES 
  (
    'e0d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0a',
    'd0d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0a',
    '【新曲】猫をテーマにした癒しの音楽',
    '猫をテーマにした癒しのオリジナル楽曲です。リラックスタイムにぴったりの音楽をお届けします。',
    'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800',
    '12:30',
    150000,
    4.8,
    'music',
    now() - interval '1 day'
  ),
  (
    'e1d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0b',
    'd1d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0b',
    '【実況】猫と一緒に遊べる最新ゲームをプレイ！',
    '今回は猫と触れ合えるゲームをプレイします。可愛い猫たちとの素敵な時間をお楽しみください。',
    'https://images.unsplash.com/photo-1494256997604-768d1f608cac?w=800',
    '25:45',
    80000,
    4.9,
    'gaming',
    now() - interval '2 days'
  ),
  (
    'e2d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0c',
    'd2d7d0e0-5e5c-4b5a-9b0a-5b5c4b5a9b0c',
    '猫型ロボットの最新技術レビュー',
    '最新の猫型ロボットの技術と機能を詳しく解説します。AIの進化が作り出す、新しいペットの形をご紹介。',
    'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=800',
    '18:20',
    120000,
    4.7,
    'tech',
    now() - interval '3 days'
  )
ON CONFLICT (id) DO NOTHING;