import { Client } from "pg";
import "dotenv/config";

const c = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await c.connect();
const r = await c.query("select tablename from pg_tables where schemaname='public' order by tablename");
console.log(r.rows);
await c.end();
