-- Reset genres table
DELETE FROM public.genres;

-- Insert main genres
INSERT INTO public.genres (name, slug, parent_id, "order") VALUES
  ('音楽', 'music', NULL, 10),
  ('ゲーム', 'gaming', NULL, 20),
  ('エンタメ', 'entertainment', NULL, 30),
  ('教育', 'education', NULL, 40),
  ('テクノロジー', 'technology', NULL, 50),
  ('ライフスタイル', 'lifestyle', NULL, 60),
  ('スポーツ', 'sports', NULL, 70),
  ('ニュース', 'news', NULL, 80);

-- Insert sub-genres for Music
WITH music_id AS (
  SELECT id FROM public.genres WHERE slug = 'music' LIMIT 1
)
INSERT INTO public.genres (name, slug, parent_id, "order") VALUES
  ('J-POP', 'j-pop', (SELECT id FROM music_id), 10),
  ('ロック', 'rock', (SELECT id FROM music_id), 20),
  ('クラシック', 'classical', (SELECT id FROM music_id), 30),
  ('ジャズ', 'jazz', (SELECT id FROM music_id), 40),
  ('アニソン', 'anime-music', (SELECT id FROM music_id), 50),
  ('EDM', 'edm', (SELECT id FROM music_id), 60);

-- Insert sub-genres for Gaming
WITH gaming_id AS (
  SELECT id FROM public.genres WHERE slug = 'gaming' LIMIT 1
)
INSERT INTO public.genres (name, slug, parent_id, "order") VALUES
  ('実況プレイ', 'lets-play', (SELECT id FROM gaming_id), 10),
  ('攻略', 'walkthrough', (SELECT id FROM gaming_id), 20),
  ('eスポーツ', 'esports', (SELECT id FROM gaming_id), 30),
  ('ゲーム紹介', 'game-review', (SELECT id FROM gaming_id), 40);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS genres_slug_idx ON public.genres (slug);
CREATE INDEX IF NOT EXISTS genres_parent_id_idx ON public.genres (parent_id);