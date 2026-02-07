-- Full Schema for SmartPharmacy

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.drugs (
  drug_id BIGSERIAL PRIMARY KEY,
  trade_name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  strength TEXT NULL,
  form TEXT NULL,
  manufacturer TEXT NULL,
  typical_pack_size TEXT NULL,
  avg_price NUMERIC NULL,
  therapeutic_group TEXT NULL,
  legal_notes TEXT NULL,
  is_brand BOOLEAN NOT NULL DEFAULT FALSE,
  country TEXT NULL,
  currency TEXT NOT NULL DEFAULT 'EGP',
  popularity INTEGER DEFAULT 0,
  price_source TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT drugs_trade_ai_unique UNIQUE (trade_name, active_ingredient)
);

CREATE TABLE IF NOT EXISTS public.categories (
  category_id BIGSERIAL PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drug_categories (
  drug_id BIGINT NOT NULL REFERENCES public.drugs(drug_id) ON DELETE CASCADE,
  category_id BIGINT NOT NULL REFERENCES public.categories(category_id) ON DELETE CASCADE,
  PRIMARY KEY (drug_id, category_id)
);

CREATE TABLE IF NOT EXISTS public.drug_aliases (
  alias_id BIGSERIAL PRIMARY KEY,
  drug_id BIGINT NOT NULL REFERENCES public.drugs(drug_id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  CONSTRAINT drug_aliases_drug_alias_unique UNIQUE (drug_id, alias)
);

CREATE INDEX IF NOT EXISTS idx_drugs_trade_trgm ON drugs USING gin ((lower(trade_name)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drugs_ai_trgm ON drugs USING gin ((lower(active_ingredient)) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_drug_aliases_trgm ON drug_aliases USING gin ((lower(alias)) gin_trgm_ops);
