import("dotenv/config").then(async () => {
  const { Client } = await import("pg");
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    const r = await c.query("select to_regclass('public.price_backup') as exists, (select count(*) from price_backup) as cnt");
    console.log("price_backup:", r.rows[0]);
    const stats = await c.query("select count(*)::int as total, count(avg_price) as with_price, count(*)-count(avg_price) as without_price from public.drugs");
    console.log("drugs stats:", stats.rows[0]);
  } catch (e) {
    console.error(e);
  } finally {
    await c.end();
    process.exit(0);
  }
});
