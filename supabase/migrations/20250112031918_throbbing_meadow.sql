-- Create function to add view history
CREATE OR REPLACE FUNCTION public.add_view_history(
  video_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update view history
  INSERT INTO public.view_history (
    user_id,
    video_id,
    viewed_at
  )
  VALUES (
    auth.uid(),
    video_id,
    now()
  )
  ON CONFLICT (user_id, video_id) DO UPDATE
  SET
    viewed_at = now(),
    updated_at = now();
END;
$$;