import("dotenv/config").then(async () => {
  const fs = await import("fs/promises");
  const path = await import("path");
  const { Client } = await import("pg");
  const csvPath = process.argv[2];
  if (!csvPath) { console.error("Usage: node scripts/import_metadata.js <path/to/metadata.csv>"); process.exit(1); }
  const text = await fs.readFile(path.resolve(csvPath), "utf8");
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const header = lines.shift().split(",").map(h => h.trim().toLowerCase());
  const idxName = header.indexOf("trade_name");
  const idxAi = header.indexOf("active_ingredient");
  const idxImg = header.indexOf("image_url");
  if (idxName < 0) { console.error("CSV must include trade_name column"); process.exit(2); }
  const rows = lines.map(l => {
    const cols = l.split(",");
    return {
      trade_name: cols[idxName]?.trim() ?? "",
      active_ingredient: idxAi>=0 ? (cols[idxAi]?.trim() || null) : null,
      image_url: idxImg>=0 ? (cols[idxImg]?.trim() || null) : null
    };
  }).filter(r => r.trade_name);
  if (rows.length === 0) { console.error("no rows"); process.exit(0); }

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    // temp table
    await client.query(`CREATE TEMP TABLE import_meta (trade_name text, active_ingredient text, image_url text)`);
    for (let i=0;i<rows.length;i+=200) {
      const chunk = rows.slice(i, i+200);
      const values = chunk.map((r, idx) => `($${idx*3+1}, $${idx*3+2}, $${idx*3+3})`).join(",");
      const params = chunk.flatMap(r => [r.trade_name, r.active_ingredient, r.image_url]);
      await client.query(`INSERT INTO import_meta(trade_name, active_ingredient, image_url) VALUES ${values}`, params);
    }
    // Update exact by trade_name
    const res = await client.query(`
      UPDATE public.drugs d
      SET active_ingredient = COALESCE(im.active_ingredient, d.active_ingredient),
          image_url = COALESCE(im.image_url, d.image_url),
          price_source = COALESCE(d.price_source, 'metadata_import')
      FROM import_meta im
      WHERE lower(d.trade_name) = lower(im.trade_name)
      RETURNING d.drug_id;
    `);
    console.log("updated exact by trade_name:", res.rowCount);

    // Try fuzzy: match import entries to closest trade_name in DB and update when similarity >= 0.5
    const unmatched = await client.query(`
      SELECT im.trade_name, im.active_ingredient, im.image_url
      FROM import_meta im
      LEFT JOIN public.drugs d ON lower(d.trade_name) = lower(im.trade_name)
      WHERE d.drug_id IS NULL
    `);
    let fuzzyUpdated = 0;
    for (const u of unmatched.rows) {
      const cand = await client.query(
        `SELECT drug_id, trade_name, similarity(lower(trade_name), lower($1)) AS sim
         FROM public.drugs
         ORDER BY sim DESC
         LIMIT 1`, [u.trade_name]
      );
      if (cand.rows.length && cand.rows[0].sim >= 0.5) {
        await client.query(`UPDATE public.drugs SET active_ingredient=$1, image_url=$2, price_source='metadata_import_fuzzy' WHERE drug_id=$3`, [u.active_ingredient, u.image_url, cand.rows[0].drug_id]);
        fuzzyUpdated++;
      }
    }
    console.log("updated fuzzy matches:", fuzzyUpdated);
  } catch (e) {
    console.error(e);
  } finally {
    await client.end();
    process.exit(0);
  }
});
