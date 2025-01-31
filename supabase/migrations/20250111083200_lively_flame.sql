/*
  # Create promotion slots and bookings tables

  1. New Tables
    - `promotion_slots`
      - `id` (uuid, primary key)
      - `name` (text) - 掲載枠の名前
      - `type` (text) - 掲載枠の種類（premium, sidebar, genre, related）
      - `price` (integer) - 1日あたりの価格
      - `max_videos` (integer) - 同時掲載可能な最大動画数
      - `description` (text) - 掲載枠の説明
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `slot_bookings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references users)
      - `slot_id` (uuid, references promotion_slots)
      - `video_id` (text) - YouTube動画ID
      - `start_date` (date)
      - `end_date` (date)
      - `status` (text) - pending, active, completed, cancelled
      - `total_price` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for read and write access
*/

-- Promotion Slots table
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

-- Slot Bookings table
CREATE TABLE IF NOT EXISTS public.slot_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  slot_id uuid REFERENCES promotion_slots ON DELETE RESTRICT,
  video_id text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL CHECK (end_date >= start_date),
  status text NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'cancelled')),
  total_price integer NOT NULL CHECK (total_price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotion_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_bookings ENABLE ROW LEVEL SECURITY;

-- Policies for promotion_slots
CREATE POLICY "Anyone can view promotion slots"
  ON public.promotion_slots
  FOR SELECT
  TO authenticated
  USING (true);

-- Policies for slot_bookings
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

-- Update trigger for updated_at
CREATE TRIGGER update_promotion_slots_updated_at
  BEFORE UPDATE ON public.promotion_slots
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_slot_bookings_updated_at
  BEFORE UPDATE ON public.slot_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();