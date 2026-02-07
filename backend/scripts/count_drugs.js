import { Client } from "pg";
import "dotenv/config";

async function main(){
  const c = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query('select count(*)::int as cnt from public.drugs');
  console.log(r.rows[0]);
  const s = await c.query('select drug_id, trade_name from public.drugs limit 10');
  console.log(s.rows);
  await c.end();
}

main().catch(e=>{ console.error(e); process.exit(1); });
