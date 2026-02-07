import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set (ex: postgres://neondb_owner:1234@localhost:5432/neondb)");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });

type MetaRow = {
  trade_name: string;
  active_ingredient?: string;
  image_url?: string;
};
type PriceRow = {
  trade_name: string;
  avg_price?: string;
};

function loadCsv<T>(relPath: string): T[] {
  const abs = path.join(process.cwd(), relPath);
  if (!fs.existsSync(abs)) {
    console.error(`CSV not found: ${abs}`);
    return [];
  }
  const raw = fs.readFileSync(abs, "utf-8");
  return parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as T[];
}

async function main() {
  const meta = loadCsv<MetaRow>("data/metadata.csv");
  const prices = loadCsv<PriceRow>("data/prices.csv");

  // فهرس أسعار حسب الاسم
  const priceMap = new Map<string, number>();
  for (const p of prices) {
    if (!p.trade_name) continue;
    const v = p.avg_price ? Number(p.avg_price) : null;
    if (v && !Number.isNaN(v)) priceMap.set(p.trade_name.trim().toLowerCase(), v);
  }

  console.log(`Loaded meta: ${meta.length}, prices: ${prices.length}`);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let ok = 0;

    for (const m of meta) {
      const name = (m.trade_name ?? "").trim();
      if (!name) continue;

      const key = name.toLowerCase();
      const price = priceMap.get(key) ?? null;
      const active = m.active_ingredient?.trim() || null;
      const image = m.image_url?.trim() || null;

      const res = await client.query(
        `
        INSERT INTO public.drugs (
          trade_name,
          active_ingredient,
          avg_price,
          currency,
          country,
          image_url
        )
        VALUES ($1,$2,$3,'EGP','EG',$4)
        ON CONFLICT (trade_name)
        DO UPDATE SET
          active_ingredient = COALESCE(EXCLUDED.active_ingredient, drugs.active_ingredient),
          avg_price = COALESCE(EXCLUDED.avg_price, drugs.avg_price),
          image_url = COALESCE(EXCLUDED.image_url, drugs.image_url),
          updated_at = now()
        RETURNING drug_id;
        `,
        [name, active, price, image]
      );

      if (res.rowCount > 0) ok++;
    }

    await client.query("COMMIT");
    console.log(`Seed done. Inserted/updated: ${ok}`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Unexpected error:", e);
  process.exit(1);
});