-- Unique per trade_name + active_ingredient, treating NULL as empty string
CREATE UNIQUE INDEX IF NOT EXISTS drugs_trade_ai_coalesce_unique
ON public.drugs (trade_name, (COALESCE(active_ingredient, '')));
