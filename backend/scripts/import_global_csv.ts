import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const pool = new Pool({ connectionString: DATABASE_URL, ssl: false });

type Row = {
  trade_name: string;
  active_ingredient?: string;
  avg_price?: string;
  currency?: string;
  country?: string;
  image_url?: string;
};

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: ts-node scripts/import_global_csv.ts <path-to-csv>");
    process.exit(1);
  }
  const abs = path.isAbsolute(csvPath) ? csvPath : path.join(process.cwd(), csvPath);
  const raw = fs.readFileSync(abs, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as Row[];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    let ok = 0;
    for (const r of rows) {
      const name = (r.trade_name ?? "").trim();
      if (!name) continue;
      const active = r.active_ingredient?.trim() || null;
      const price = r.avg_price ? Number(r.avg_price) : null;
      const currency = r.currency?.trim() || "USD";
      const country = r.country?.trim() || "US";
      const image = r.image_url?.trim() || null;

      const res = await client.query(
        `
        INSERT INTO public.drugs (
          trade_name, active_ingredient, avg_price, currency, country, image_url
        )
        VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (trade_name) DO UPDATE SET
          active_ingredient = COALESCE(EXCLUDED.active_ingredient, drugs.active_ingredient),
          avg_price        = COALESCE(EXCLUDED.avg_price, drugs.avg_price),
          currency         = COALESCE(EXCLUDED.currency, drugs.currency),
          country          = COALESCE(EXCLUDED.country, drugs.country),
          image_url        = COALESCE(EXCLUDED.image_url, drugs.image_url);
        `,
        [name, active, price, currency, country, image]
      );
      if (res.rowCount > 0) ok++;
    }
    await client.query("COMMIT");
    console.log(`Imported/updated: ${ok}`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Import failed:", e);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});