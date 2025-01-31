-- Create table for storing file metadata
CREATE TABLE IF NOT EXISTS public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL,
  name text NOT NULL,
  size integer NOT NULL,
  mime_type text,
  owner uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(bucket_id, name)
);

-- Enable RLS
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS files_bucket_name_idx ON public.files (bucket_id, name);
CREATE INDEX IF NOT EXISTS files_owner_idx ON public.files (owner);

-- Create policies
CREATE POLICY "Allow authenticated users to upload files"
  ON public.files
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND owner = auth.uid()
  );

CREATE POLICY "Allow public access to public files"
  ON public.files
  FOR SELECT
  TO public
  USING (public = true OR owner = auth.uid());

CREATE POLICY "Allow users to update their own files"
  ON public.files
  FOR UPDATE
  TO authenticated
  USING (owner = auth.uid())
  WITH CHECK (owner = auth.uid());

CREATE POLICY "Allow users to delete their own files"
  ON public.files
  FOR DELETE
  TO authenticated
  USING (owner = auth.uid());

-- Add trigger for updating updated_at
CREATE TRIGGER files_updated_at
  BEFORE UPDATE ON public.files
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();