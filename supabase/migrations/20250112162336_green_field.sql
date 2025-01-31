/*
  # View History Table Creation

  1. Changes
    - Drop existing view_history table
    - Create new view_history table with proper foreign key references
    - Add indexes for performance optimization
    - Enable RLS and create policies
    - Add trigger for updated_at timestamp

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Drop existing table
DROP TABLE IF EXISTS public.view_history;

-- Create base table
CREATE TABLE IF NOT EXISTS public.view_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id uuid NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE public.view_history
  ADD CONSTRAINT view_history_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Create indexes one at a time
CREATE INDEX IF NOT EXISTS view_history_user_id_idx 
  ON public.view_history (user_id);

CREATE INDEX IF NOT EXISTS view_history_video_id_idx 
  ON public.view_history (video_id);

CREATE INDEX IF NOT EXISTS view_history_viewed_at_idx 
  ON public.view_history (viewed_at);

-- Enable RLS
ALTER TABLE public.view_history ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can view own history" ON public.view_history;
  DROP POLICY IF EXISTS "Users can add to own history" ON public.view_history;

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
END $$;

-- Add trigger for updating updated_at
DO $$
BEGIN
  DROP TRIGGER IF EXISTS view_history_updated_at ON public.view_history;
  
  CREATE TRIGGER view_history_updated_at
    BEFORE UPDATE ON public.view_history
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
END $$;