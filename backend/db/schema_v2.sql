BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

ALTER TABLE drugs
  ADD COLUMN IF NOT EXISTS is_brand boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS country text NULL,
  ADD COLUMN IF NOT EXISTS currency text NULL DEFAULT 'EGP',
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS categories (
  category_id SERIAL PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text,
  slug text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drug_categories (
  drug_id integer NOT NULL REFERENCES drugs(drug_id) ON DELETE CASCADE,
  category_id integer NOT NULL REFERENCES categories(category_id) ON DELETE CASCADE,
  PRIMARY KEY (drug_id, category_id)
);

CREATE TABLE IF NOT EXISTS drug_aliases (
  alias_id SERIAL PRIMARY KEY,
  drug_id integer NOT NULL REFERENCES drugs(drug_id) ON DELETE CASCADE,
  alias text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_drugs_trade_trgm
  ON drugs USING gin ((lower(trade_name)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_drugs_ai_trgm
  ON drugs USING gin ((lower(active_ingredient)) gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_drug_aliases_trgm
  ON drug_aliases USING gin ((lower(alias)) gin_trgm_ops);

COMMIT;