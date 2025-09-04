-- Create RPC function for updating user coins as fallback
CREATE OR REPLACE FUNCTION public.update_user_coins(
  user_id UUID,
  new_coin_count INTEGER
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.users 
  SET coins = new_coin_count 
  WHERE id = user_id AND is_active = true;
  
  IF FOUND THEN
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
EXCEPTION 
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.update_user_coins TO authenticated;
