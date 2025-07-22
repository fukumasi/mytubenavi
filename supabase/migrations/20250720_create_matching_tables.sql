-- matching_candidates
CREATE TABLE IF NOT EXISTS public.matching_candidates (
  user_id      uuid        NOT NULL,
  candidate_id uuid        NOT NULL,
  similarity   numeric(5,4) NOT NULL,  -- 例: 0.9231
  matched_at   timestamptz DEFAULT now(),
  CONSTRAINT matching_pk PRIMARY KEY (user_id, candidate_id)
);
CREATE INDEX IF NOT EXISTS matching_similarity_idx
  ON public.matching_candidates (user_id, similarity DESC);

-- matching_settings（閾値やモードを動的に変更したい場合）
CREATE TABLE IF NOT EXISTS public.matching_settings (
  key   text  PRIMARY KEY,
  value jsonb NOT NULL
);

-- 変更検知用トリガ
CREATE OR REPLACE FUNCTION public.notify_matching_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_notify('matching_update', NEW.user_id::text);
  RETURN NEW;
END;
$$;
CREATE TRIGGER matching_update_trigger
  AFTER INSERT OR UPDATE ON public.matching_candidates
  FOR EACH ROW EXECUTE FUNCTION public.notify_matching_update();
