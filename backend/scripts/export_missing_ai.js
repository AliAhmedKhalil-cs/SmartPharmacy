import("dotenv/config").then(async () => {
  const { Client } = await import("pg");
  const fs = await import("fs/promises");
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    const r = await client.query("SELECT drug_id, trade_name FROM public.drugs WHERE active_ingredient IS NULL ORDER BY drug_id");
    const header = "drug_id,trade_name\r\n";
    const lines = r.rows.map(x => `${x.drug_id},"${(x.trade_name||'').replace(/"/g,'""')}"`).join("\r\n");
    await fs.writeFile('./data/missing_active_ingredient.csv', header + lines, 'utf8');
    console.log('wrote ./data/missing_active_ingredient.csv rows=', r.rowCount);
  } catch (e) { console.error(e); }
  finally { await client.end(); process.exit(0); }
});
