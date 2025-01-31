-- Function to check slot availability
CREATE OR REPLACE FUNCTION public.check_slot_availability(
  slot_id uuid,
  start_date date,
  end_date date
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  slot_exists boolean;
  current_count integer;
  max_videos integer;
BEGIN
  -- Check if slot exists
  SELECT EXISTS (
    SELECT 1 FROM public.promotion_slots WHERE id = slot_id
  ) INTO slot_exists;

  IF NOT slot_exists THEN
    RAISE EXCEPTION 'Invalid slot ID';
  END IF;

  -- Get max videos for slot
  SELECT promotion_slots.max_videos 
  INTO max_videos
  FROM public.promotion_slots 
  WHERE id = slot_id;

  -- Count current bookings for date range
  SELECT COUNT(DISTINCT video_id)
  INTO current_count
  FROM public.slot_bookings
  WHERE slot_id = check_slot_availability.slot_id
    AND status = 'active'
    AND start_date <= check_slot_availability.end_date
    AND end_date >= check_slot_availability.start_date;

  -- Return true if space is available
  RETURN current_count < max_videos;
END;
$$;

-- Function to calculate booking price
CREATE OR REPLACE FUNCTION public.calculate_booking_price(
  slot_id uuid,
  start_date date,
  end_date date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  daily_price integer;
  days integer;
BEGIN
  -- Get daily price for slot
  SELECT price INTO daily_price
  FROM public.promotion_slots
  WHERE id = slot_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid slot ID';
  END IF;

  -- Calculate number of days
  days := end_date - start_date + 1;

  -- Calculate total price
  RETURN daily_price * days;
END;
$$;

-- Function to book promotion slot
CREATE OR REPLACE FUNCTION public.book_promotion_slot(
  slot_id uuid,
  video_id uuid,
  start_date date,
  end_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_booking_id uuid;
  total_price integer;
BEGIN
  -- Check availability
  IF NOT public.check_slot_availability(slot_id, start_date, end_date) THEN
    RAISE EXCEPTION 'Slot is not available for selected dates';
  END IF;

  -- Calculate price
  total_price := public.calculate_booking_price(slot_id, start_date, end_date);

  -- Create booking
  INSERT INTO public.slot_bookings (
    user_id,
    slot_id,
    video_id,
    start_date,
    end_date,
    status,
    total_price
  )
  VALUES (
    auth.uid(),
    slot_id,
    video_id,
    start_date,
    end_date,
    'pending',
    total_price
  )
  RETURNING id INTO new_booking_id;

  RETURN new_booking_id;
END;
$$;

-- Function to get active promotions
CREATE OR REPLACE FUNCTION public.get_active_promotions(
  promotion_type text DEFAULT NULL
)
RETURNS TABLE (
  booking_id uuid,
  slot_name text,
  slot_type text,
  video_id uuid,
  video_title text,
  channel_name text,
  start_date date,
  end_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sb.id as booking_id,
    ps.name as slot_name,
    ps.type as slot_type,
    v.id as video_id,
    v.title as video_title,
    yp.channel_name,
    sb.start_date,
    sb.end_date
  FROM public.slot_bookings sb
  JOIN public.promotion_slots ps ON sb.slot_id = ps.id
  JOIN public.videos v ON sb.video_id = v.id
  JOIN public.youtuber_profiles yp ON v.youtuber_id = yp.id
  WHERE sb.status = 'active'
    AND current_date BETWEEN sb.start_date AND sb.end_date
    AND (promotion_type IS NULL OR ps.type = promotion_type)
  ORDER BY ps.type, sb.start_date;
END;
$$;

-- Function to get promotion stats
CREATE OR REPLACE FUNCTION public.get_promotion_stats(
  user_id uuid,
  start_date date DEFAULT NULL,
  end_date date DEFAULT NULL
)
RETURNS TABLE (
  total_bookings bigint,
  total_revenue bigint,
  active_bookings bigint,
  upcoming_bookings bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) as total_bookings,
    COALESCE(SUM(total_price), 0) as total_revenue,
    COUNT(*) FILTER (WHERE status = 'active' AND current_date BETWEEN start_date AND end_date) as active_bookings,
    COUNT(*) FILTER (WHERE status = 'pending' AND start_date > current_date) as upcoming_bookings
  FROM public.slot_bookings
  WHERE user_id = get_promotion_stats.user_id
    AND (get_promotion_stats.start_date IS NULL OR start_date >= get_promotion_stats.start_date)
    AND (get_promotion_stats.end_date IS NULL OR end_date <= get_promotion_stats.end_date);
END;
$$;