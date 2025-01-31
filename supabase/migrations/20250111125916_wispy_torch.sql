/*
  # Add role column to profiles table

  1. Changes
    - Add role column to profiles table with default value 'user'
    - Add check constraint to ensure valid role values
    - Add index on role column for better query performance

  2. Notes
    - Existing profiles will have 'user' role by default
    - Valid roles are: 'user', 'youtuber', 'admin'
*/

-- Add role column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN role text NOT NULL DEFAULT 'user';

    -- Add check constraint for valid roles
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('user', 'youtuber', 'admin'));

    -- Add index for role column
    CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles (role);
  END IF;
END $$;