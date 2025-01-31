-- Create storage bucket for avatars
DO $$ 
BEGIN
  -- Create storage bucket if it doesn't exist
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('avatars', 'avatars', true)
  ON CONFLICT (id) DO NOTHING;

  -- Create policies for storage objects
  CREATE POLICY "Allow authenticated users to upload avatars"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars'
      AND auth.role() = 'authenticated'
    );

  CREATE POLICY "Allow public access to avatars"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

  CREATE POLICY "Allow users to update their own avatars"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'avatars' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'avatars' AND owner = auth.uid());

  CREATE POLICY "Allow users to delete their own avatars"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'avatars' AND owner = auth.uid());

EXCEPTION
  WHEN undefined_table THEN
    -- If storage.buckets doesn't exist, create a fallback table in public schema
    CREATE TABLE IF NOT EXISTS public.user_avatars (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
      file_name text NOT NULL,
      file_path text NOT NULL,
      mime_type text,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Enable RLS
    ALTER TABLE public.user_avatars ENABLE ROW LEVEL SECURITY;

    -- Create policies
    CREATE POLICY "Users can manage their own avatars"
      ON public.user_avatars
      FOR ALL
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());

    -- Add trigger for updating updated_at
    CREATE TRIGGER user_avatars_updated_at
      BEFORE UPDATE ON public.user_avatars
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
END $$;