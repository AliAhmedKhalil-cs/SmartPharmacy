import fs from "node:fs";
import path from "node:path";
import { Pool } from "pg";
import { parse } from "csv-parse/sync";
import "dotenv/config";

function splitPipe(v) {
  return String(v ?? "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
}

function makeSlug(nameAr) {
  return String(nameAr ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}\-]+/gu, "");
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error("Usage: node scripts/import_drugs_csv.js <path-to-csv>");
    process.exit(1);
  }

  const abs = path.resolve(csvPath);
  if (!fs.existsSync(abs)) {
    console.error(`CSV not found: ${abs}`);
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL in backend/.env");
    process.exit(1);
  }

  const raw = fs.readFileSync(abs, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    let processed = 0;

    for (const r of rows) {
      const trade_name = String(r.trade_name ?? "").trim();
      if (!trade_name) continue;

      const active_ingredient = String(r.active_ingredient ?? "").trim() || null;

      const avg_price =
        String(r.avg_price_egp ?? "").trim() !== ""
          ? Number(r.avg_price_egp)
          : null;

      const is_brand = String(r.is_brand ?? "").trim().toLowerCase() === "true";
      const country = String(r.country ?? "").trim() || null;
      const currency = String(r.currency ?? "").trim() || "EGP";

      const drugRes = await client.query(
        `
        INSERT INTO public.drugs
          (trade_name, active_ingredient, strength, form, manufacturer, typical_pack_size, avg_price,
           therapeutic_group, legal_notes, is_brand, country, currency)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (trade_name, (COALESCE(active_ingredient, '')))
        DO UPDATE SET
          strength = COALESCE(EXCLUDED.strength, public.drugs.strength),
          form = COALESCE(EXCLUDED.form, public.drugs.form),
          manufacturer = COALESCE(EXCLUDED.manufacturer, public.drugs.manufacturer),
          typical_pack_size = COALESCE(EXCLUDED.typical_pack_size, public.drugs.typical_pack_size),
          avg_price = COALESCE(EXCLUDED.avg_price, public.drugs.avg_price),
          therapeutic_group = COALESCE(EXCLUDED.therapeutic_group, public.drugs.therapeutic_group),
          legal_notes = COALESCE(EXCLUDED.legal_notes, public.drugs.legal_notes),
          is_brand = COALESCE(EXCLUDED.is_brand, public.drugs.is_brand),
          country = COALESCE(EXCLUDED.country, public.drugs.country),
          currency = COALESCE(EXCLUDED.currency, public.drugs.currency),
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
          is_brand,
          country,
          currency,
        ]
      );

      const drug_id = drugRes.rows[0].drug_id;

      for (const c of splitPipe(r.categories_ar)) {
        const slug = makeSlug(c);
        if (!slug) continue;

        const catRes = await client.query(
          `
          INSERT INTO public.categories (name_ar, slug)
          VALUES ($1,$2)
          ON CONFLICT (slug) DO UPDATE SET name_ar = EXCLUDED.name_ar
          RETURNING category_id;
          `,
          [c, slug]
        );

        await client.query(
          `INSERT INTO public.drug_categories (drug_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING;`,
          [drug_id, catRes.rows[0].category_id]
        );
      }

      for (const a of splitPipe(r.aliases)) {
        await client.query(
          `INSERT INTO public.drug_aliases (drug_id, alias) VALUES ($1,$2) ON CONFLICT DO NOTHING;`,
          [drug_id, a]
        );
      }

      processed++;
      if (processed % 500 === 0) console.log(`Processed ${processed}...`);
    }

    console.log(`Done. Rows processed: ${processed}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
