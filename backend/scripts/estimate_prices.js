import("dotenv/config").then(async () => {
  const { Client } = await import("pg");
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    await c.query(`CREATE TABLE IF NOT EXISTS price_backup AS TABLE public.drugs WITH NO DATA`);
    const b = await c.query(`INSERT INTO price_backup(drug_id, avg_price) SELECT drug_id, avg_price FROM public.drugs WHERE avg_price IS NOT NULL ON CONFLICT DO NOTHING`);
    console.log("backup done");
    const rows = (await c.query(`SELECT drug_id, trade_name, active_ingredient FROM public.drugs WHERE avg_price IS NULL`)).rows;
    console.log("to-process:", rows.length);
    let updated = 0;
    for (const r of rows) {
      let est = null;
      if (r.active_ingredient) {
        const res = await c.query(`SELECT ROUND(AVG(avg_price)::numeric,2) AS avgp FROM public.drugs WHERE active_ingredient = $1 AND avg_price IS NOT NULL`, [r.active_ingredient]);
        est = res.rows[0] && res.rows[0].avgp ? Number(res.rows[0].avgp) : null;
      }
      if (!est) {
        const res2 = await c.query(
          `SELECT ROUND(AVG(avg_price)::numeric,2) AS avgp FROM (
             SELECT avg_price FROM public.drugs WHERE avg_price IS NOT NULL
             ORDER BY similarity(lower(trade_name), lower($1)) DESC
             LIMIT 8
           ) t`, [r.trade_name]
        );
        est = res2.rows[0] && res2.rows[0].avgp ? Number(res2.rows[0].avgp) : null;
      }
      if (est) {
        await c.query(`UPDATE public.drugs SET avg_price = $1 WHERE drug_id = $2`, [est, r.drug_id]);
        updated++;
      }
    }
    console.log("updated count:", updated);
  } catch (e) {
    console.error("estimate error", e);
  } finally {
    await c.end();
  }
  process.exit(0);
});
