-- Add coins_spent column to track per-extraction spend
ALTER TABLE public.extractions
ADD COLUMN IF NOT EXISTS coins_spent numeric NOT NULL DEFAULT 0;

-- Optional: backfill nulls if any (safety for existing rows)
UPDATE public.extractions
SET coins_spent = COALESCE(coins_spent, 0);


