const fs = require("fs");

const input = "/work/data/query.csv";
const output = "/work/data/drugs_import_big.csv";

if (!fs.existsSync(input)) {
  console.error("Missing:", input);
  process.exit(1);
}

const text = fs.readFileSync(input, "utf8");
const lines = text.split(/\r?\n/).filter(Boolean);

const header =
  "trade_name,active_ingredient,strength,form,manufacturer,typical_pack_size,avg_price_egp,therapeutic_group,legal_notes,categories_ar,aliases,is_brand,country,currency,source";

const out = [header];

function esc(v) {
  v = String(v ?? "");
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

// helper: very simple CSV split; OK if values don't contain commas.
// Your query.csv appears simple (no embedded commas).
for (let i = 1; i < lines.length; i++) {
  const parts = lines[i].split(",");
  const trade = (parts[0] || "").trim();
  const ai = (parts[1] || "").trim();
  const ar = (parts[2] || "").trim();
  const atc = (parts[3] || "").trim();

  if (!trade) continue;

  const aliases = [trade, trade.toLowerCase(), ai, ai.toLowerCase(), ar, atc]
    .filter(Boolean)
    .join("|");

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