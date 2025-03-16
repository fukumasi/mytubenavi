-- ユーザー統計機能のためのデータベース関数
-- Migration: add_user_statistics_functions

-- 日別ユーザー登録数を取得する関数
CREATE OR REPLACE FUNCTION get_daily_user_registrations(
  start_date date,
  end_date date
)
RETURNS TABLE (registration_date date, user_count bigint) AS $$
BEGIN
  RETURN QUERY 
  SELECT
    date_trunc('day', created_at)::date as registration_date,
    COUNT(*)::bigint as user_count
  FROM 
    profiles
  WHERE 
    created_at >= start_date AND
    created_at <= (end_date + interval '1 day - 1 second')
  GROUP BY 
    date_trunc('day', created_at)
  ORDER BY 
    registration_date;
END;
$$ LANGUAGE plpgsql;

-- 月別ユーザー登録数を取得する関数
CREATE OR REPLACE FUNCTION get_monthly_user_registrations(
  start_date date,
  end_date date
)
RETURNS TABLE (registration_month text, user_count bigint) AS $$
BEGIN
  RETURN QUERY 
  SELECT
    to_char(date_trunc('month', created_at), 'YYYY-MM') as registration_month,
    COUNT(*)::bigint as user_count
  FROM 
    profiles
  WHERE 
    created_at >= start_date AND
    created_at <= (end_date + interval '1 day - 1 second')
  GROUP BY 
    date_trunc('month', created_at)
  ORDER BY 
    registration_month;
END;
$$ LANGUAGE plpgsql;

-- get_role_distribution関数のコメント（既に存在するため、再作成はしない）
COMMENT ON FUNCTION get_role_distribution() IS 'ロール別のユーザー集計を行う関数';