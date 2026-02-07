import("dotenv/config").then(async () => {
  const fs = await import("fs/promises");
  const path = await import("path");
  const { Client } = await import("pg");

  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error("Usage: node scripts/import_prices_from_csv.js <path/to/prices.csv>");
    process.exit(1);
  }
  const csvPath = path.resolve(args[0]);

  function parseCSVLine(line) {
    const cols = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"' ) {
        if (inQuotes && line[i+1] === '"') { cur += '"'; i++; continue; }
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        cols.push(cur);
        cur = "";
        continue;
      }
      cur += ch;
    }
    cols.push(cur);
    return cols.map(s => s.trim());
  }

  try {
    const text = await fs.readFile(csvPath, { encoding: "utf8" });
    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    const header = parseCSVLine(lines.shift()).map(h => h.toLowerCase());
    const idxName = header.indexOf("trade_name") >= 0 ? header.indexOf("trade_name")
                    : (header.indexOf("name") >= 0 ? header.indexOf("name") : -1);
    const idxPrice = header.indexOf("avg_price") >= 0 ? header.indexOf("avg_price")
                     : (header.indexOf("price") >= 0 ? header.indexOf("price") : -1);
    if (idxName === -1 || idxPrice === -1) {
      console.error("CSV must include headers: trade_name and avg_price (or name and price)");
      process.exit(2);
    }

    const rows = lines.map(l => parseCSVLine(l)).map(cols => ({
      trade_name: cols[idxName] || "",
      avg_price: cols[idxPrice] ? Number(cols[idxPrice]) : null
    })).filter(r => r.trade_name && r.avg_price != null && !Number.isNaN(r.avg_price));

    if (rows.length === 0) {
      console.error("No valid rows found in CSV to import.");
      process.exit(3);
    }

    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();

    // Create temp table import_prices
    await client.query(`CREATE TEMP TABLE import_prices (trade_name text, avg_price numeric)`);

    // Insert in batches
    const batchSize = 200;
    for (let i = 0; i < rows.length; i += batchSize) {
      const chunk = rows.slice(i, i + batchSize);
      const values = [];
      const params = [];
      for (let j = 0; j < chunk.length; j++) {
        params.push(chunk[j].trade_name);
        params.push(chunk[j].avg_price);
        values.push(`($${params.length - 1}, $${params.length})`);
      }
      // Adjust param numbering
      const paramPlaceholders = values.map((_, idx) => {
        const base = idx * 2;
        return `($${base + 1}, $${base + 2})`;
      }).join(", ");
      const flat = chunk.flatMap(r => [r.trade_name, r.avg_price]);
      const textInsert = `INSERT INTO import_prices(trade_name, avg_price) VALUES ${paramPlaceholders}`;
      await client.query(textInsert, flat);
    }

    // Update by exact lower(trade_name) match
    const updateExact = await client.query(`
      UPDATE public.drugs d
      SET avg_price = ip.avg_price, price_source = 'imported'
      FROM import_prices ip
      WHERE lower(d.trade_name) = lower(ip.trade_name)
      RETURNING d.drug_id;
    `);
    console.log("Updated by exact trade_name:", updateExact.rowCount);

    // For remaining import rows that did not match exactly, try fuzzy mapping by similarity:
    // create temp table unmatched_imports (those not matched)
    await client.query(`
      CREATE TEMP TABLE unmatched_imports AS
      SELECT ip.*
      FROM import_prices ip
      LEFT JOIN public.drugs d ON lower(d.trade_name) = lower(ip.trade_name)
      WHERE d.drug_id IS NULL;
    `);

    // For each unmatched import, find best matching drug (highest similarity) and update if similarity >= 0.4
    const fuzzyUpdated = { count: 0 };
    const unmatched = await client.query(`SELECT trade_name, avg_price FROM unmatched_imports`);
    for (const u of unmatched.rows) {
      const cand = await client.query(
        `SELECT drug_id, trade_name, similarity(lower(trade_name), lower($1)) AS sim
         FROM public.drugs
         WHERE avg_price IS NULL OR avg_price IS NOT NULL
         ORDER BY sim DESC
         LIMIT 1`, [u.trade_name]
      );
      if (cand.rows.length > 0 && cand.rows[0].sim >= 0.4) {
        await client.query(`UPDATE public.drugs SET avg_price = $1, price_source='imported_fuzzy' WHERE drug_id = $2`, [u.avg_price, cand.rows[0].drug_id]);
        fuzzyUpdated.count++;
      }
    }
    console.log("Updated by fuzzy import:", fuzzyUpdated.count);

    // Final stats
    const stats = await client.query(`SELECT count(*)::int AS total, count(avg_price) AS with_price, count(*)-count(avg_price) AS without_price FROM public.drugs`);
    console.log("After import - stats:", stats.rows[0]);

    await client.end();
    process.exit(0);
  } catch (e) {
    console.error("Import error:", e);
    process.exit(1);
  }
});
