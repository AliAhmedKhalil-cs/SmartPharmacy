DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'drugs_trade_ai_unique'
  ) THEN
    ALTER TABLE drugs ADD CONSTRAINT drugs_trade_ai_unique UNIQUE (trade_name, active_ingredient);
  END IF;
END $$;