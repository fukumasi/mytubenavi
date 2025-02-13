/*
 # Fix user registration and table structure with trigger handling

 1. Changes
   - Add trigger cleanup
   - Maintain existing table structure
   - Ensure proper cascade deletion
   - Add view_history table
 
 2. Security
   - Recreate RLS policies
   - Protect data integrity
*/

-- Drop existing triggers first
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS reviews_updated_at ON public.reviews;
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create own reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;

-- Drop existing tables with proper cascade
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.view_history CASCADE;

-- Profiles table (main user data table)
CREATE TABLE IF NOT EXISTS public.profiles (
 id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
 username text,
 bio text,
 avatar_url text,
 role text DEFAULT 'user',
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now()
);

-- Recreate reviews table with reference to profiles
CREATE TABLE IF NOT EXISTS public.reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
 video_id text NOT NULL,
 rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
 comment text,
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now()
);

-- Create view_history table
CREATE TABLE IF NOT EXISTS public.view_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
 video_id text NOT NULL,
 viewed_at timestamptz DEFAULT now(),
 created_at timestamptz DEFAULT now(),
 updated_at timestamptz DEFAULT now(),
 UNIQUE(user_id, video_id)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.view_history ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS profiles_username_idx ON public.profiles (username);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS reviews_video_id_idx ON public.reviews (video_id);
CREATE INDEX IF NOT EXISTS view_history_user_id_idx ON public.view_history (user_id);
CREATE INDEX IF NOT EXISTS view_history_video_id_idx ON public.view_history (video_id);
CREATE INDEX IF NOT EXISTS view_history_viewed_at_idx ON public.view_history (viewed_at);

-- Profile policies
CREATE POLICY "Public profiles are viewable by everyone"
 ON public.profiles
 FOR SELECT
 USING (true);

CREATE POLICY "Users can insert their own profile"
 ON public.profiles
 FOR INSERT
 WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
 ON public.profiles
 FOR UPDATE
 USING (auth.uid() = id);

-- Review policies
CREATE POLICY "Anyone can read reviews"
 ON public.reviews
 FOR SELECT
 TO anon, authenticated
 USING (true);

CREATE POLICY "Users can create own reviews"
 ON public.reviews
 FOR INSERT
 TO authenticated
 WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
 ON public.reviews
 FOR UPDATE
 TO authenticated
 USING (auth.uid() = user_id);

-- View history policies
CREATE POLICY "Users can view their own history"
 ON public.view_history
 FOR SELECT
 TO authenticated
 USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
 ON public.view_history
 FOR INSERT
 TO authenticated
 WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own history"
 ON public.view_history
 FOR UPDATE
 TO authenticated
 USING (auth.uid() = user_id);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
 NEW.updated_at = now();
 RETURN NEW;
END;
$$ language plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER profiles_updated_at
 BEFORE UPDATE ON public.profiles
 FOR EACH ROW
 EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER reviews_updated_at
 BEFORE UPDATE ON public.reviews
 FOR EACH ROW
 EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER view_history_updated_at
 BEFORE UPDATE ON public.view_history
 FOR EACH ROW
 EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for creating profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
 INSERT INTO public.profiles (id, username)
 VALUES (
   NEW.id,
   COALESCE(
     NEW.raw_user_meta_data->>'username',
     split_part(NEW.raw_user_meta_data->>'email', '@', 1)
   )
 );
 RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER create_profile_on_signup
 AFTER INSERT ON auth.users
 FOR EACH ROW
 EXECUTE FUNCTION public.handle_new_user();