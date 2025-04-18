-- ユーザー認証テーブルに不足カラムを追加
ALTER TABLE user_verification 
ADD COLUMN IF NOT EXISTS verification_provider TEXT,
ADD COLUMN IF NOT EXISTS verification_id TEXT,
ADD COLUMN IF NOT EXISTS verification_expiry TIMESTAMP WITH TIME ZONE;

-- 既存のデータに対してデフォルト値を設定（必要に応じて）
-- UPDATE user_verification SET verification_provider = 'none' WHERE verification_provider IS NULL;

-- コメント追加
COMMENT ON COLUMN user_verification.verification_provider IS '認証サービスプロバイダ（Firebase等）';
COMMENT ON COLUMN user_verification.verification_id IS '外部認証サービスでの識別子';
COMMENT ON COLUMN user_verification.verification_expiry IS '認証の有効期限';