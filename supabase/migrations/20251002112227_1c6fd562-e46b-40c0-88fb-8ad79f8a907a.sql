-- Create user points table
CREATE TABLE IF NOT EXISTS public.user_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  last_daily_bonus TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create gifts catalog table
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  price INTEGER NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user gifts table (sent/received)
CREATE TABLE IF NOT EXISTS public.user_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create point transactions table
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_points
CREATE POLICY "Users can view all points" ON public.user_points FOR SELECT USING (true);
CREATE POLICY "Users can insert their own points" ON public.user_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own points" ON public.user_points FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for gifts
CREATE POLICY "Anyone can view gifts catalog" ON public.gifts FOR SELECT USING (true);

-- RLS Policies for user_gifts
CREATE POLICY "Users can view gifts sent to or by them" ON public.user_gifts FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send gifts" ON public.user_gifts FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for point_transactions
CREATE POLICY "Users can view their own transactions" ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON public.point_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Insert gifts catalog
INSERT INTO public.gifts (name, emoji, price, rarity) VALUES
  ('Diamond Ring', '💍', 10000, 'legendary'),
  ('Golden Crown', '👑', 7500, 'legendary'),
  ('Luxury Bouquet', '💐', 5000, 'epic'),
  ('Teddy Bear', '🧸', 3000, 'epic'),
  ('Chocolate Box', '🍫', 2500, 'rare'),
  ('Fancy Book', '📚', 2000, 'rare'),
  ('Cricket Bat', '🏏', 1500, 'rare'),
  ('Headphones', '🎧', 1200, 'rare'),
  ('Sneakers', '👟', 1000, 'rare'),
  ('Sunglasses', '🕶️', 800, 'common'),
  ('Coffee Mug', '☕', 500, 'common'),
  ('Heart Balloon', '🎈', 300, 'common'),
  ('Star Pendant', '⭐', 200, 'common'),
  ('Friendship Band', '🎀', 100, 'common'),
  ('Candy', '🍬', 50, 'common');

-- Function to award points
CREATE OR REPLACE FUNCTION public.award_points(_user_id UUID, _points INTEGER, _action TEXT, _description TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update user points
  INSERT INTO public.user_points (user_id, total_points)
  VALUES (_user_id, _points)
  ON CONFLICT (user_id)
  DO UPDATE SET 
    total_points = user_points.total_points + _points,
    updated_at = now();
  
  -- Log transaction
  INSERT INTO public.point_transactions (user_id, points, action, description)
  VALUES (_user_id, _points, _action, _description);
END;
$$;

-- Function to send gift
CREATE OR REPLACE FUNCTION public.send_gift(
  _gift_id UUID,
  _receiver_id UUID,
  _message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_id UUID := auth.uid();
  _gift_price INTEGER;
  _sender_points INTEGER;
  _gift_name TEXT;
BEGIN
  -- Get gift price and name
  SELECT price, name INTO _gift_price, _gift_name
  FROM public.gifts
  WHERE id = _gift_id;
  
  IF _gift_price IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Gift not found');
  END IF;
  
  -- Get sender points
  SELECT total_points INTO _sender_points
  FROM public.user_points
  WHERE user_id = _sender_id;
  
  IF _sender_points IS NULL OR _sender_points < _gift_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points');
  END IF;
  
  -- Deduct points
  UPDATE public.user_points
  SET total_points = total_points - _gift_price,
      updated_at = now()
  WHERE user_id = _sender_id;
  
  -- Log transaction
  INSERT INTO public.point_transactions (user_id, points, action, description)
  VALUES (_sender_id, -_gift_price, 'gift_sent', 'Sent ' || _gift_name || ' to user');
  
  -- Create gift record
  INSERT INTO public.user_gifts (gift_id, sender_id, receiver_id, message)
  VALUES (_gift_id, _sender_id, _receiver_id, _message);
  
  RETURN jsonb_build_object('success', true, 'remaining_points', _sender_points - _gift_price);
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_user_points_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_points_updated_at_trigger
BEFORE UPDATE ON public.user_points
FOR EACH ROW
EXECUTE FUNCTION public.update_user_points_updated_at();