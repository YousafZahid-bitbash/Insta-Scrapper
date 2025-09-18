-- Idempotent spend logs per batch
create table if not exists public.extraction_spend_logs (
  id bigserial primary key,
  extraction_id integer not null references public.extractions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  batch_key text not null,
  amount numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, extraction_id, batch_key)
);


