import fs from "node:fs";

function esc(v) {
  v = String(v ?? "");
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function uniqPipe(values) {
  const set = new Set(values.map((x) => String(x ?? "").trim()).filter(Boolean));
  return Array.from(set).join("|");
}

const input = process.argv[2];
const output = process.argv[3];

if (!input || !output) {
  console.error("Usage: node scripts/make_import_big.js <input query.csv> <output drugs_import_big.csv>");
  process.exit(1);
}

if (!fs.existsSync(input)) {
  console.error("Input not found:", input);
  process.exit(1);
}

const text = fs.readFileSync(input, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);

const headerOut =
  "trade_name,active_ingredient,strength,form,manufacturer,typical_pack_size,avg_price_egp,therapeutic_group,legal_notes,categories_ar,aliases,is_brand,country,currency,source";

const out = [headerOut];

// expecting input header: trade_name,active_ingredient,label_ar,atc_code
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(",");
  const trade = (parts[0] || "").trim();
  const ai = (parts[1] || "").trim();
  const ar = (parts[2] || "").trim();
  const atc = (parts[3] || "").trim();

  if (!trade) continue;

  const aliases = uniqPipe([trade, trade.toLowerCase(), ai, ai.toLowerCase(), ar, atc]);

  out.push(
    [
      trade,
      ai,
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      aliases,
      "false",
      "",
      "EGP",
      "wikidata",
    ]
      .map(esc)
      .join(",")
  );
}

fs.writeFileSync(output, out.join("\n"), "utf8");
console.log("Wrote:", output, "rows:", out.length - 1);
