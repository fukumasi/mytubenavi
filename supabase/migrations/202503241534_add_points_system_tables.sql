/*
  # ポイントシステムのテーブルと関数

  1. 新しいテーブル
    - `user_points`
      - ユーザーのポイント残高を管理
    - `point_transactions`
      - ポイントの取引履歴を記録

  2. 関数
    - `create_user_points_table`
    - `create_point_transactions_table`

  3. セキュリティ設定
    - RLSポリシーの設定
*/

-- user_pointsテーブルを作成する関数
CREATE OR REPLACE FUNCTION public.create_user_points_table()
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  table_exists boolean;
BEGIN
  -- テーブルが既に存在するか確認
  SELECT public.check_table_exists('user_points') INTO table_exists;
  
  -- テーブルが既に存在していれば何もしない
  IF table_exists THEN
    RETURN true;
  END IF;

  -- テーブルの作成
  CREATE TABLE IF NOT EXISTS public.user_points (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    balance integer NOT NULL DEFAULT 0,
    lifetime_earned integer NOT NULL DEFAULT 0,
    last_updated timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT positive_lifetime CHECK (lifetime_earned >= 0)
  );

  -- インデックスの作成
  CREATE INDEX IF NOT EXISTS user_points_user_id_idx ON public.user_points (user_id);

  -- RLSの有効化
  ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

  -- ポリシーの作成
  CREATE POLICY "Users can read their own points"
    ON public.user_points
    FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can create their own points"
    ON public.user_points
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "System can update points"
    ON public.user_points
    FOR UPDATE
    USING (true);

  -- updated_at トリガーの設定
  CREATE TRIGGER handle_updated_at
    BEFORE UPDATE ON public.user_points
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

  RETURN true;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error creating user_points table: %', SQLERRM;
    RETURN false;
END;
$$;

-- point_transactionsテーブルを作成する関数
CREATE OR REPLACE FUNCTION public.create_point_transactions_table()
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  table_exists boolean;
BEGIN
  -- テーブルが既に存在するか確認
  SELECT public.check_table_exists('point_transactions') INTO table_exists;
  
  -- テーブルが既に存在していれば何もしない
  IF table_exists THEN
    RETURN true;
  END IF;

  -- テーブルの作成
  CREATE TABLE IF NOT EXISTS public.point_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    amount integer NOT NULL,
    transaction_type text NOT NULL,
    reference_id text,
    description text,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT valid_transaction_type CHECK (
      transaction_type IN (
        'review', 
        'purchase', 
        'message', 
        'profile_view', 
        'refund', 
        'login_bonus', 
        'streak_bonus', 
        'like',
        'match_bonus',
        'message_activity',
        'filter_usage'
      )
    )
  );

  -- インデックスの作成
  CREATE INDEX IF NOT EXISTS point_transactions_user_id_idx ON public.point_transactions (user_id);
  CREATE INDEX IF NOT EXISTS point_transactions_created_at_idx ON public.point_transactions (created_at);
  CREATE INDEX IF NOT EXISTS point_transactions_type_idx ON public.point_transactions (transaction_type);

  -- RLSの有効化
  ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

  -- ポリシーの作成
  CREATE POLICY "Users can read their own transactions"
    ON public.point_transactions
    FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "Users can insert their own transactions"
    ON public.point_transactions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "System can insert transactions"
    ON public.point_transactions
    FOR INSERT
    WITH CHECK (true);

  RETURN true;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error creating point_transactions table: %', SQLERRM;
    RETURN false;
END;
$$;

-- 初期ポイント付与関数
CREATE OR REPLACE FUNCTION grant_initial_points(p_user_id uuid, p_amount integer DEFAULT 10)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_points boolean;
BEGIN
  -- すでにポイントを持っているか確認
  SELECT EXISTS (
    SELECT 1 FROM public.user_points WHERE user_id = p_user_id
  ) INTO has_points;
  
  -- すでにポイントを持っている場合は何もしない
  IF has_points THEN
    RETURN true;
  END IF;
  
  -- user_pointsテーブルにレコードを作成
  INSERT INTO public.user_points (
    user_id,
    balance,
    lifetime_earned
  ) VALUES (
    p_user_id,
    p_amount,
    p_amount
  );
  
  -- トランザクション履歴を記録
  INSERT INTO public.point_transactions (
    user_id,
    amount,
    transaction_type,
    description
  ) VALUES (
    p_user_id,
    p_amount,
    'login_bonus',
    '初回登録ボーナス'
  );
  
  RETURN true;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Error granting initial points: %', SQLERRM;
    RETURN false;
END;
$$;

-- テーブルの作成を実行
SELECT public.create_user_points_table();
SELECT public.create_point_transactions_table();

-- テーブルが正しく作成されたか確認
SELECT public.check_table_exists('user_points') as user_points_exists;
SELECT public.check_table_exists('point_transactions') as point_transactions_exists;

-- 既存のユーザーに初期ポイントを付与（オプション）
/*
DO $$ 
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM public.profiles LOOP
    PERFORM grant_initial_points(user_record.id);
  END LOOP;
END $$;
*/