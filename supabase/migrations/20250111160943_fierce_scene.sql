/*
  # Add genre hierarchy structure

  1. New Tables
    - `genres`
      - `id` (uuid, primary key)
      - `name` (text) - ジャンル名
      - `slug` (text) - URL用のスラッグ
      - `parent_id` (uuid) - 親ジャンルのID（大ジャンルの場合はnull）
      - `order` (integer) - 表示順
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Changes
    - Add genre hierarchy support
    - Add indexes for efficient querying
    - Add RLS policies
*/

-- Create genres table
CREATE TABLE IF NOT EXISTS public.genres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  parent_id uuid REFERENCES public.genres(id),
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS genres_parent_id_idx ON public.genres (parent_id);
CREATE INDEX IF NOT EXISTS genres_slug_idx ON public.genres (slug);
CREATE INDEX IF NOT EXISTS genres_order_idx ON public.genres ("order");

-- Enable RLS
ALTER TABLE public.genres ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view genres"
  ON public.genres
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Add trigger for updating updated_at
CREATE TRIGGER genres_updated_at
  BEFORE UPDATE ON public.genres
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample data
INSERT INTO public.genres (name, slug, parent_id, "order") VALUES
  -- 大ジャンル
  ('音楽', 'music', NULL, 10),
  ('ゲーム', 'gaming', NULL, 20),
  ('エンタメ', 'entertainment', NULL, 30),
  ('教育', 'education', NULL, 40),
  ('テクノロジー', 'technology', NULL, 50),
  ('ライフスタイル', 'lifestyle', NULL, 60),
  ('スポーツ', 'sports', NULL, 70),
  ('ニュース', 'news', NULL, 80)
ON CONFLICT (slug) DO NOTHING;

-- 中ジャンルの追加（音楽）
WITH music_id AS (
  SELECT id FROM public.genres WHERE slug = 'music' LIMIT 1
)
INSERT INTO public.genres (name, slug, parent_id, "order") VALUES
  ('J-POP', 'j-pop', (SELECT id FROM music_id), 10),
  ('ロック', 'rock', (SELECT id FROM music_id), 20),
  ('クラシック', 'classical', (SELECT id FROM music_id), 30),
  ('ジャズ', 'jazz', (SELECT id FROM music_id), 40),
  ('アニソン', 'anime-music', (SELECT id FROM music_id), 50),
  ('EDM', 'edm', (SELECT id FROM music_id), 60),
  ('歌ってみた', 'covers', (SELECT id FROM music_id), 70),
  ('演奏してみた', 'performances', (SELECT id FROM music_id), 80)
ON CONFLICT (slug) DO NOTHING;

-- 中ジャンルの追加（ゲーム）
WITH gaming_id AS (
  SELECT id FROM public.genres WHERE slug = 'gaming' LIMIT 1
)
INSERT INTO public.genres (name, slug, parent_id, "order") VALUES
  ('実況プレイ', 'lets-play', (SELECT id FROM gaming_id), 10),
  ('攻略', 'walkthrough', (SELECT id FROM gaming_id), 20),
  ('eスポーツ', 'esports', (SELECT id FROM gaming_id), 30),
  ('ゲーム紹介', 'game-review', (SELECT id FROM gaming_id), 40),
  ('ゲーム実況', 'gameplay', (SELECT id FROM gaming_id), 50),
  ('マインクラフト', 'minecraft', (SELECT id FROM gaming_id), 60),
  ('スマホゲーム', 'mobile-games', (SELECT id FROM gaming_id), 70)
ON CONFLICT (slug) DO NOTHING;

-- Add genre_id column to videos table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'videos' 
    AND column_name = 'genre_id'
  ) THEN
    ALTER TABLE public.videos 
    ADD COLUMN genre_id uuid REFERENCES public.genres(id);

    CREATE INDEX IF NOT EXISTS videos_genre_id_idx ON public.videos (genre_id);
  END IF;
END $$;