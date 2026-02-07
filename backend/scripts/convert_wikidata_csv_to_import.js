import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

function norm(s) {
  return String(s ?? "").trim();
}

function uniqPipe(values) {
  const set = new Set(values.map((x) => norm(x)).filter(Boolean));
  return Array.from(set).join("|");
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (s.includes('"') || s.includes(",") || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  const input = process.argv[2];
  const output = process.argv[3];

  if (!input || !output) {
    console.error(
      "Usage: node scripts/convert_wikidata_csv_to_import.js <wikidata_raw.csv> <drugs_import_big.csv>"
    );
    process.exit(1);
  }

  const inAbs = path.resolve(input);
  const outAbs = path.resolve(output);

  if (!fs.existsSync(inAbs)) {
    console.error("Input not found:", inAbs);
    process.exit(1);
  }

  const raw = fs.readFileSync(inAbs, "utf-8");
  const rows = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

  const header = [
    "trade_name",
    "active_ingredient",
    "strength",
    "form",
    "manufacturer",
    "typical_pack_size",
    "avg_price_egp",
    "therapeutic_group",
    "legal_notes",
    "categories_ar",
    "aliases",
    "is_brand",
    "country",
    "currency",
    "source",
  ].join(",");

  const out = [header];

  let kept = 0;
  for (const r of rows) {
    const trade_name = norm(r.trade_name);
    // active ingredient may be empty; keep row anyway (still searchable)
    const active_ingredient = norm(r.active_ingredient);

    if (!trade_name) continue;

    const label_ar = norm(r.label_ar);
    const atc = norm(r.atc_code);

    // Aliases: english name + arabic label if exists + lowercase variants
    const aliasesList = [
      trade_name,
      trade_name.toLowerCase(),
      label_ar,
      active_ingredient,
      active_ingredient.toLowerCase(),
      atc,
    ].filter(Boolean);

    // categories_ar: leave empty now (we can map ATC later)
    const categories_ar = "";

    const row = {
      trade_name,
      active_ingredient,
      strength: "",
      form: "",
      manufacturer: "",
      typical_pack_size: "",
      avg_price_egp: "",
      therapeutic_group: "",
      legal_notes: "",
      categories_ar,
      aliases: uniqPipe(aliasesList),
      is_brand: "false",
      country: "",
      currency: "EGP",
      source: "wikidata",
    };

    out.push(
      [
        row.trade_name,
        row.active_ingredient,
        row.strength,
        row.form,
        row.manufacturer,
        row.typical_pack_size,
        row.avg_price_egp,
        row.therapeutic_group,
        row.legal_notes,
        row.categories_ar,
        row.aliases,
        row.is_brand,
        row.country,
        row.currency,
        row.source,
      ]
        .map(csvEscape)
        .join(",")
    );

    kept++;
  }

  fs.writeFileSync(outAbs, out.join("\n"), "utf-8");
  console.log(`Converted OK. Rows: ${kept}`);
  console.log(`Output: ${outAbs}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});