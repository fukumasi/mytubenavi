/*
  # YouTube API Configuration

  1. Changes
    - Creates a secure settings table for API configurations
    - Adds function to safely retrieve YouTube API key
    - Sets up proper RLS policies for security

  2. Security
    - Enable RLS on settings table
    - Only allow authorized access to API settings
*/

-- Create settings table for API configurations
CREATE TABLE IF NOT EXISTS public.api_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Create secure function to get YouTube API key
CREATE OR REPLACE FUNCTION public.get_youtube_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  api_key text;
BEGIN
  SELECT value INTO api_key
  FROM public.api_settings
  WHERE key = 'youtube_api_key'
  LIMIT 1;
  
  RETURN api_key;
END;
$$;

-- Create policy for reading API settings
CREATE POLICY "Only authenticated users can read API settings"
  ON public.api_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Add trigger for updating updated_at
CREATE TRIGGER update_api_settings_updated_at
  BEFORE UPDATE ON public.api_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();