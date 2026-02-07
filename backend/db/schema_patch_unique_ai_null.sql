-- Prevent multiple rows with same trade_name when active_ingredient is NULL
CREATE UNIQUE INDEX IF NOT EXISTS drugs_trade_name_unique_when_ai_null
ON public.drugs (trade_name)
WHERE active_ingredient IS NULL;
