-- Create an atomic function to spend coins for an extraction
-- Deducts coins from users table and increments extractions.coins_spent in one transaction
create or replace function public.spend_extraction_coins(
  p_user_id uuid,
  p_extraction_id integer,
  p_amount numeric
)
returns void
language plpgsql
as $$
begin
  if p_amount <= 0 then
    return;
  end if;

  -- Deduct from user and increment coins_spent atomically
  update public.users u
  set coins = u.coins - p_amount
  where u.id = p_user_id
    and u.coins >= p_amount;

  if not found then
    raise exception 'insufficient_coins';
  end if;

  update public.extractions e
  set coins_spent = coalesce(e.coins_spent, 0) + p_amount
  where e.id = p_extraction_id;
end;
$$;


