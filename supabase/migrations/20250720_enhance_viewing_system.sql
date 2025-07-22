 
-- =================================================================
-- MyTubeNavi 2.0: 視聴傾向ベースマッチングシステム データベース拡張
-- =================================================================

-- 1. 視聴履歴テーブル拡張
CREATE TABLE IF NOT EXISTS public.viewing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id VARCHAR(255) NOT NULL,
  video_title TEXT,
  channel_name TEXT,
  category VARCHAR(100),
  tags TEXT[],
  viewing_duration INTEGER CHECK (viewing_duration >= 0),
  video_length INTEGER CHECK (video_length > 0),
  completion_rate DECIMAL(3,2) CHECK (completion_rate BETWEEN 0.00 AND 1.00),
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 複合インデックス用
  CONSTRAINT viewing_history_user_video_unique UNIQUE (user_id, video_id, watched_at)
);

-- インデックス作成（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_viewing_history_user_id 
  ON public.viewing_history (user_id);
CREATE INDEX IF NOT EXISTS idx_viewing_history_category 
  ON public.viewing_history (category);
CREATE INDEX IF NOT EXISTS idx_viewing_history_watched_at 
  ON public.viewing_history (watched_at);
CREATE INDEX IF NOT EXISTS idx_viewing_history_user_category 
  ON public.viewing_history (user_id, category);

-- 2. ユーザー視聴パターン（前処理データ）テーブル
CREATE TABLE IF NOT EXISTS public.user_viewing_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_vector DECIMAL[],           -- カテゴリ別視聴時間ベクトル
  rating_vector DECIMAL[],            -- 評価パターンベクトル  
  viewing_time_pattern JSONB,         -- 時間帯別視聴パターン
  genre_preferences JSONB,            -- ジャンル別統計
  total_viewing_time INTEGER DEFAULT 0,
  total_videos_watched INTEGER DEFAULT 0,
  average_completion_rate DECIMAL(3,2),
  last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  
  CONSTRAINT viewing_patterns_valid_completion 
    CHECK (average_completion_rate IS NULL OR average_completion_rate BETWEEN 0.00 AND 1.00)
);

-- 3. matching_candidates テーブル拡張（既存テーブルに列追加）
DO $$ 
BEGIN
  -- content_similarity列が存在しない場合のみ追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'matching_candidates' AND column_name = 'content_similarity'
  ) THEN
    ALTER TABLE public.matching_candidates 
      ADD COLUMN content_similarity DECIMAL(5,4),
      ADD COLUMN rating_correlation DECIMAL(5,4),
      ADD COLUMN viewing_pattern_match DECIMAL(5,4),
      ADD COLUMN genre_similarity DECIMAL(5,4),
      ADD COLUMN common_videos_count INTEGER DEFAULT 0,
      ADD COLUMN match_reason JSONB,
      ADD COLUMN calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours');
  END IF;
END $$;

-- 4. 視聴データ記録用関数
CREATE OR REPLACE FUNCTION public.track_video_viewing(
  p_user_id UUID,
  p_video_id VARCHAR(255),
  p_video_title TEXT DEFAULT NULL,
  p_channel_name TEXT DEFAULT NULL,
  p_category VARCHAR(100) DEFAULT NULL,
  p_viewing_duration INTEGER DEFAULT NULL,
  p_video_length INTEGER DEFAULT NULL,
  p_completion_rate DECIMAL(3,2) DEFAULT NULL,
  p_user_rating INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  viewing_record_id UUID;
  calculated_completion DECIMAL(3,2);
BEGIN
  -- 完了率の計算（もし提供されていない場合）
  IF p_completion_rate IS NULL AND p_viewing_duration IS NOT NULL AND p_video_length IS NOT NULL AND p_video_length > 0 THEN
    calculated_completion := LEAST(1.0, p_viewing_duration::DECIMAL / p_video_length::DECIMAL);
  ELSE
    calculated_completion := p_completion_rate;
  END IF;

  -- 視聴履歴に記録
  INSERT INTO public.viewing_history (
    user_id, video_id, video_title, channel_name, category,
    viewing_duration, video_length, completion_rate, user_rating
  ) VALUES (
    p_user_id, p_video_id, p_video_title, p_channel_name, p_category,
    p_viewing_duration, p_video_length, calculated_completion, p_user_rating
  ) 
  ON CONFLICT (user_id, video_id, watched_at) 
  DO UPDATE SET
    viewing_duration = EXCLUDED.viewing_duration,
    completion_rate = EXCLUDED.completion_rate,
    user_rating = EXCLUDED.user_rating
  RETURNING id INTO viewing_record_id;
  
  -- 視聴パターンの更新フラグを立てる（非同期処理用）
  INSERT INTO public.user_viewing_patterns (user_id, version)
  VALUES (p_user_id, 1)
  ON CONFLICT (user_id) 
  DO UPDATE SET version = user_viewing_patterns.version + 1;
  
  RETURN viewing_record_id;
EXCEPTION
  WHEN OTHERS THEN
    -- エラーログ記録（本番環境では適切なログシステムを使用）
    RAISE WARNING '視聴データ記録エラー: ユーザーID=%, 動画ID=%, エラー=%', p_user_id, p_video_id, SQLERRM;
    RETURN NULL;
END;

$$;

-- 5. 共通視聴動画取得関数
CREATE OR REPLACE FUNCTION public.get_common_videos(
  p_user_id_1 UUID,
  p_user_id_2 UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  video_id VARCHAR(255),
  video_title TEXT,
  user1_rating INTEGER,
  user2_rating INTEGER,
  user1_completion DECIMAL(3,2),
  user2_completion DECIMAL(3,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    vh1.video_id,
    vh1.video_title,
    vh1.user_rating as user1_rating,
    vh2.user_rating as user2_rating,
    vh1.completion_rate as user1_completion,
    vh2.completion_rate as user2_completion
  FROM public.viewing_history vh1
  INNER JOIN public.viewing_history vh2 
    ON vh1.video_id = vh2.video_id
  WHERE vh1.user_id = p_user_id_1 
    AND vh2.user_id = p_user_id_2
  ORDER BY 
    COALESCE(vh1.completion_rate, 0) + COALESCE(vh2.completion_rate, 0) DESC
  LIMIT p_limit;
END;

$$;

-- 6. Row Level Security (RLS) 設定
ALTER TABLE public.viewing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_viewing_patterns ENABLE ROW LEVEL SECURITY;

-- 視聴履歴は本人のみアクセス可能
CREATE POLICY "Users can manage own viewing history" ON public.viewing_history
  FOR ALL USING (auth.uid() = user_id);

-- 視聴パターンは本人のみアクセス可能
CREATE POLICY "Users can view own patterns" ON public.user_viewing_patterns
  FOR SELECT USING (auth.uid() = user_id);

-- 7. 初期設定データ挿入
INSERT INTO public.matching_settings (key, value) 
VALUES 
  ('STRICT_MODE', '{"minSimilarity": 0.85, "minCommonVideos": 20, "maxResults": 50}'::jsonb),
  ('STANDARD_MODE', '{"minSimilarity": 0.70, "minCommonVideos": 10, "maxResults": 100}'::jsonb),
  ('RELAXED_MODE', '{"minSimilarity": 0.60, "minCommonVideos": 5, "maxResults": 200}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 8. トリガー関数（パフォーマンス監視用）
CREATE OR REPLACE FUNCTION public.log_viewing_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 統計更新など、必要に応じて処理を追加
  RETURN NEW;
END;

$$;

-- 視聴データ挿入時のトリガー
CREATE TRIGGER viewing_history_trigger
  AFTER INSERT ON public.viewing_history
  FOR EACH ROW EXECUTE FUNCTION public.log_viewing_activity();

-- 9. 便利なビュー作成
CREATE OR REPLACE VIEW public.user_viewing_stats AS
SELECT 
  user_id,
  COUNT(*) as total_videos,
  COUNT(DISTINCT category) as unique_categories,
  AVG(completion_rate) as avg_completion_rate,
  AVG(user_rating) as avg_rating,
  SUM(viewing_duration) as total_viewing_time,
  MAX(watched_at) as last_viewing
FROM public.viewing_history 
WHERE watched_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id;

-- コメント追加
COMMENT ON TABLE public.viewing_history IS 'ユーザーの動画視聴履歴を記録するテーブル';
COMMENT ON TABLE public.user_viewing_patterns IS 'マッチング計算用の前処理済み視聴パターンデータ';
COMMENT ON FUNCTION public.track_video_viewing IS '動画視聴データを記録する関数';
COMMENT ON FUNCTION public.get_common_videos IS '2人のユーザー間の共通視聴動画を取得する関数';
