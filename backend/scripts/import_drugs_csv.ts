import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Example: postgres://neondb_owner:1234@localhost:5432/neondb");
  process.exit(1);
}

console.log("Using DATABASE_URL:", DATABASE_URL);

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false,
});

type Row = {
  trade_name: string;
  active_ingredient: string;
  strength?: string;
  form?: string;
  manufacturer?: string;
  typical_pack_size?: string;
  avg_price_egp?: string;
  therapeutic_group?: string;
  legal_notes?: string;
  categories_ar?: string;
  aliases?: string;
  source?: string;
};

function splitPipe(v?: string) {
  return (v ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: ts-node scripts/import_drugs_csv.ts <path-to-csv>");
    process.exit(1);
  }

  const abs = path.resolve(csvPath);
  if (!fs.existsSync(abs)) {
    console.error(`CSV not found: ${abs}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(abs, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true }) as Row[];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    let ok = 0;
    for (const r of rows) {
      const trade_name = (r.trade_name ?? "").trim();
      const active_ingredient = (r.active_ingredient ?? "").trim();
      if (!trade_name || !active_ingredient) continue;

      const avg_price = r.avg_price_egp?.trim() ? Number(r.avg_price_egp) : null;

      const drugRes = await client.query(
        `
        INSERT INTO drugs
          (trade_name, active_ingredient, strength, form, manufacturer, typical_pack_size, avg_price, therapeutic_group, legal_notes)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (trade_name, active_ingredient)
        DO UPDATE SET
          strength = COALESCE(EXCLUDED.strength, drugs.strength),
          form = COALESCE(EXCLUDED.form, drugs.form),
          manufacturer = COALESCE(EXCLUDED.manufacturer, drugs.manufacturer),
          typical_pack_size = COALESCE(EXCLUDED.typical_pack_size, drugs.typical_pack_size),
          avg_price = COALESCE(EXCLUDED.avg_price, drugs.avg_price),
          therapeutic_group = COALESCE(EXCLUDED.therapeutic_group, drugs.therapeutic_group),
          legal_notes = COALESCE(EXCLUDED.legal_notes, drugs.legal_notes),
          updated_at = now()
        RETURNING drug_id;
        `,
        [
          trade_name,
          active_ingredient,
          r.strength || null,
          r.form || null,
          r.manufacturer || null,
          r.typical_pack_size || null,
          avg_price,
          r.therapeutic_group || null,
          r.legal_notes || null,
        ]
      );

      const drug_id: number = drugRes.rows[0].drug_id;

      const cats = splitPipe(r.categories_ar);
      for (const c of cats) {
        const cRes = await client.query(
          `
          INSERT INTO categories (name_ar, slug)
          VALUES ($1, lower(regexp_replace($1, '\\s+', '-', 'g')))
          ON CONFLICT (slug) DO UPDATE SET name_ar = EXCLUDED.name_ar
          RETURNING category_id;
          `,
          [c]
        );
        const category_id: number = cRes.rows[0].category_id;
        await client.query(
          `INSERT INTO drug_categories (drug_id, category_id)
           VALUES ($1,$2) ON CONFLICT DO NOTHING;`,
          [drug_id, category_id]
        );
      }

      const aliases = splitPipe(r.aliases);
      for (const a of aliases) {
        await client.query(
          `INSERT INTO drug_aliases (drug_id, alias) VALUES ($1,$2) ON CONFLICT DO NOTHING;`,
          [drug_id, a]
        );
      }

      ok++;
      if (ok % 1000 === 0) console.log(`Imported ${ok} rows...`);
    }

    await client.query("COMMIT");
    console.log(`Done. Imported/updated: ${ok}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
