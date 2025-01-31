-- Create view_history table
CREATE TABLE IF NOT EXISTS public.view_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS view_history_user_id_idx ON public.view_history (user_id);
CREATE INDEX IF NOT EXISTS view_history_video_id_idx ON public.view_history (video_id);
CREATE INDEX IF NOT EXISTS view_history_viewed_at_idx ON public.view_history (viewed_at);

-- Enable RLS
ALTER TABLE public.view_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own history"
  ON public.view_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to own history"
  ON public.view_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updating updated_at
CREATE TRIGGER view_history_updated_at
  BEFORE UPDATE ON public.view_history
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();