CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS drugs_trade_name_trgm
  ON public.drugs USING gin (lower(trade_name) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS drugs_active_ingredient_trgm
  ON public.drugs USING gin (lower(COALESCE(active_ingredient, '')) gin_trgm_ops);