-- Update spend_extraction_coins to be idempotent per batch_key
create or replace function public.spend_extraction_coins(
  p_user_id uuid,
  p_extraction_id integer,
  p_amount numeric,
  p_batch_key text
)
returns void
language plpgsql
as $$
begin
  if p_amount <= 0 then
    return;
  end if;

  -- Check if this batch was already spent
  if exists (
    select 1 from public.extraction_spend_logs 
    where user_id = p_user_id 
      and extraction_id = p_extraction_id 
      and batch_key = p_batch_key
  ) then
    -- already spent for this batch, exit early
    return;
  end if;

  -- Insert spend log
  insert into public.extraction_spend_logs(user_id, extraction_id, batch_key, amount)
  values (p_user_id, p_extraction_id, p_batch_key, p_amount);

  update public.users u
  set coins = u.coins - p_amount
  where u.id = p_user_id
    and u.coins >= p_amount;

  if not found then
    -- rollback spend log if insufficient
    delete from public.extraction_spend_logs
    where user_id = p_user_id and extraction_id = p_extraction_id and batch_key = p_batch_key;
    raise exception 'insufficient_coins';
  end if;

  update public.extractions e
  set coins_spent = coalesce(e.coins_spent, 0) + p_amount
  where e.id = p_extraction_id;
end;
$$;


