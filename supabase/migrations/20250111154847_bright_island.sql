/*
  # お気に入り機能の追加

  1. 新しいテーブル
    - `favorites`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `video_id` (uuid, references videos)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. インデックス
    - user_id と video_id の複合インデックス
    - video_id のインデックス

  3. セキュリティ
    - RLSの有効化
    - 認証ユーザーのみが自分のお気に入りを管理できるポリシー
*/

-- お気に入りテーブルの作成
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id uuid REFERENCES public.videos(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS favorites_user_video_idx ON public.favorites (user_id, video_id);
CREATE INDEX IF NOT EXISTS favorites_video_id_idx ON public.favorites (video_id);

-- RLSの有効化
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- ポリシーの作成
CREATE POLICY "Users can view own favorites"
  ON public.favorites
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add own favorites"
  ON public.favorites
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own favorites"
  ON public.favorites
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- updated_atの自動更新
CREATE TRIGGER favorites_updated_at
  BEFORE UPDATE ON public.favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();