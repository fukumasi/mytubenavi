-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Anyone can view promotion slots" ON public.promotion_slots;
  DROP POLICY IF EXISTS "Users can view own bookings" ON public.slot_bookings;
  DROP POLICY IF EXISTS "Users can create own bookings" ON public.slot_bookings;
  DROP POLICY IF EXISTS "Users can update own bookings" ON public.slot_bookings;
END $$;

-- Create promotion slots table
CREATE TABLE IF NOT EXISTS public.promotion_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('premium', 'sidebar', 'genre', 'related')),
  price integer NOT NULL CHECK (price >= 0),
  max_videos integer NOT NULL CHECK (max_videos > 0),
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create slot bookings table
CREATE TABLE IF NOT EXISTS public.slot_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES public.promotion_slots(id) ON DELETE RESTRICT,
  video_id uuid REFERENCES public.videos(id) ON DELETE RESTRICT,
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  status text NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  total_price integer NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS slot_bookings_user_id_idx ON public.slot_bookings (user_id);
CREATE INDEX IF NOT EXISTS slot_bookings_slot_id_idx ON public.slot_bookings (slot_id);
CREATE INDEX IF NOT EXISTS slot_bookings_video_id_idx ON public.slot_bookings (video_id);
CREATE INDEX IF NOT EXISTS slot_bookings_date_range_idx ON public.slot_bookings (start_date, end_date);
CREATE INDEX IF NOT EXISTS slot_bookings_status_idx ON public.slot_bookings (status);

-- Enable RLS
ALTER TABLE public.promotion_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_bookings ENABLE ROW LEVEL SECURITY;

-- Create policies for promotion slots
CREATE POLICY "Anyone can view promotion slots"
  ON public.promotion_slots
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for slot bookings
CREATE POLICY "Users can view own bookings"
  ON public.slot_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bookings"
  ON public.slot_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings"
  ON public.slot_bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add triggers for updating updated_at
CREATE TRIGGER promotion_slots_updated_at
  BEFORE UPDATE ON public.promotion_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER slot_bookings_updated_at
  BEFORE UPDATE ON public.slot_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert sample promotion slots
INSERT INTO public.promotion_slots (name, type, price, max_videos, description) VALUES
  ('プレミアム掲載枠', 'premium', 10000, 5, 'トップページのメイン表示枠。最も目立つ位置に動画が表示されます。'),
  ('サイドバー掲載枠', 'sidebar', 5000, 10, '全ページのサイドバーに表示される掲載枠。継続的な露出が期待できます。'),
  ('ジャンル優先表示枠', 'genre', 3000, 15, '特定のジャンルページで上位に表示される掲載枠。ターゲットを絞った宣伝に最適です。'),
  ('関連動画優先表示枠', 'related', 2000, 20, '動画詳細ページの関連動画として優先表示される掲載枠。')
ON CONFLICT DO NOTHING;