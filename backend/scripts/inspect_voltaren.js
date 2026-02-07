import("dotenv/config").then(async () => {
  const { Client } = await import("pg");
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const r = await c.query("select drug_id, trade_name, active_ingredient, avg_price, currency from public.drugs where lower(trade_name) like lower('%voltaren%') limit 50");
    console.log("voltaren rows:", r.rows);
  } catch (e) {
    console.error(e);
  } finally {
    await c.end();
    process.exit(0);
  }
});
