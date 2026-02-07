import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import "dotenv/config";

function stripWeirdLeadingChars(s) {
  if (!s) return s;
  // remove UTF-8 BOM and common zero-width chars anywhere
  return s
    .replace(/^\uFEFF/, "")
    .replace(/\uFEFF/g, "")
    .replace(/\u200B/g, "")
    .replace(/\u200C/g, "")
    .replace(/\u200D/g, "");
}

async function main() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error("Usage: node scripts/run_sql_file.js <path-to-sql>");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL in backend/.env");
    process.exit(1);
  }

  const filePath = path.resolve(sqlFile);
  let sql = fs.readFileSync(filePath, "utf8");
  sql = stripWeirdLeadingChars(sql);

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query("SET search_path TO public;");
    await client.query(sql);
    console.log("Applied:", filePath);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
