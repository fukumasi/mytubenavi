-- お気に入りテーブルの作成（存在しない場合のみ）
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, video_id)
);

-- インデックスの作成（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS favorites_user_video_idx ON public.favorites (user_id, video_id);
CREATE INDEX IF NOT EXISTS favorites_video_id_idx ON public.favorites (video_id);

-- RLSの有効化
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除してから作成
DO $$ 
BEGIN
  -- 既存のポリシーを削除
  DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
  DROP POLICY IF EXISTS "Users can add own favorites" ON public.favorites;
  DROP POLICY IF EXISTS "Users can remove own favorites" ON public.favorites;

  -- ポリシーを作成
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
END $$;

-- トリガーの作成（存在しない場合のみ）
DROP TRIGGER IF EXISTS favorites_updated_at ON public.favorites;
CREATE TRIGGER favorites_updated_at
  BEFORE UPDATE ON public.favorites
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();