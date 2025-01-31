/*
  # Add videos table and related functions

  1. New Tables
    - `videos`
      - `id` (uuid, primary key)
      - `youtuber_id` (uuid, references youtuber_profiles)
      - `title` (text)
      - `description` (text)
      - `thumbnail` (text)
      - `duration` (text)
      - `view_count` (integer)
      - `rating` (numeric)
      - `published_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on videos table
    - Add policies for video access and management
*/

-- Videos table
CREATE TABLE IF NOT EXISTS public.videos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  youtuber_id uuid REFERENCES public.youtuber_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  thumbnail text,
  duration text,
  view_count integer DEFAULT 0,
  rating numeric(3,2) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  published_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS videos_youtuber_id_idx ON public.videos (youtuber_id);
CREATE INDEX IF NOT EXISTS videos_published_at_idx ON public.videos (published_at);
CREATE INDEX IF NOT EXISTS videos_title_idx ON public.videos (title);
CREATE INDEX IF NOT EXISTS videos_description_idx ON public.videos (description);

-- Video policies
CREATE POLICY "Anyone can view published videos"
  ON public.videos
  FOR SELECT
  USING (true);

CREATE POLICY "YouTubers can manage their own videos"
  ON public.videos
  FOR ALL
  USING (
    auth.uid() = youtuber_id
    AND EXISTS (
      SELECT 1 FROM public.youtuber_profiles
      WHERE id = auth.uid()
      AND verification_status = 'verified'
    )
  );

-- Add trigger for updating updated_at
CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();