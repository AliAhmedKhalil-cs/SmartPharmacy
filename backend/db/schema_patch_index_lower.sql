CREATE INDEX IF NOT EXISTS drugs_trade_name_lower_trgm ON public.drugs USING gin (lower(trade_name) gin_trgm_ops);
