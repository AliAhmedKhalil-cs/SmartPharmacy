import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const pool = new Pool({ connectionString: DATABASE_URL });

// CHANGE THIS to your actual CDN image URL
const DEFAULT_IMAGE_URL = "https://res.cloudinary.com/YOUR_CLOUD/image/upload/v1234567890/medicine-pack.png";

async function main() {
  const client = await pool.connect();
  try {
    const { rowCount } = await client.query(
      `
      UPDATE public.drugs
      SET image_url = $1
      WHERE image_url IS NULL OR image_url = '';
      `,
      [DEFAULT_IMAGE_URL]
    );
    console.log(`Updated ${rowCount} rows with image_url.`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("fillImages error:", e);
  process.exit(1);
});