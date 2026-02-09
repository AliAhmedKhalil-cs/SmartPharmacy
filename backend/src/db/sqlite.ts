import sqlite3 from 'sqlite3'
import { open, Database } from 'sqlite'
import path from 'path'
import os from 'os'

let dbPromise: Promise<Database> | null = null

const dbFile = process.env.NODE_ENV === 'production'
  ? path.join(os.tmpdir(), 'smartpharmacy.db')
  : path.join(process.cwd(), 'database.sqlite')

export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = open({ filename: dbFile, driver: sqlite3.Database })
  }
  return await dbPromise
}

export async function ensureCoreTables(): Promise<void> {
  const db = await getDb()
  
  await db.exec('PRAGMA foreign_keys = ON;')

  await db.exec(`
    CREATE TABLE IF NOT EXISTS interaction_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      a_active TEXT NOT NULL,
      b_active TEXT NOT NULL,
      severity TEXT NOT NULL,
      summary TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_interactions_a ON interaction_rules(a_active);
    CREATE INDEX IF NOT EXISTS idx_interactions_b ON interaction_rules(b_active);

    CREATE TABLE IF NOT EXISTS sales_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pharmacy_id INTEGER,
      drug_trade_name TEXT NOT NULL,
      sold_date TEXT NOT NULL,
      qty INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sales_drug_date ON sales_daily(drug_trade_name, sold_date);

    CREATE TABLE IF NOT EXISTS stock_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pharmacy_id INTEGER,
      drug_trade_name TEXT NOT NULL,
      snap_date TEXT NOT NULL,
      qty INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_stock_drug_date ON stock_snapshots(drug_trade_name, snap_date);

    CREATE TABLE IF NOT EXISTS pharmacies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      gps_lat REAL,
      gps_lng REAL,
      logo_url TEXT
    );

    CREATE TABLE IF NOT EXISTS pharmacy_stock (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pharmacy_id INTEGER,
      drug_trade_name TEXT,
      price REAL,
      stock_quantity INTEGER DEFAULT 10,
      FOREIGN KEY(pharmacy_id) REFERENCES pharmacies(id)
    );
    CREATE INDEX IF NOT EXISTS idx_stock_pharmacy_drug ON pharmacy_stock(pharmacy_id, drug_trade_name);

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_code TEXT NOT NULL,
      pharmacy_id INTEGER,
      created_at TEXT NOT NULL,
      status TEXT NOT NULL,
      patient_age INTEGER,
      patient_sex TEXT,
      patient_weight REAL,
      patient_allergies TEXT,
      patient_conditions TEXT,
      patient_current_meds TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      trade_name TEXT NOT NULL,
      active_ingredient TEXT,
      qty INTEGER NOT NULL,
      unit_price REAL,
      available INTEGER DEFAULT 0,
      FOREIGN KEY(order_id) REFERENCES orders(id)
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
  `)

  const count = await db.get<{ c: number }>('SELECT COUNT(1) as c FROM interaction_rules')
  if ((count?.c ?? 0) === 0) {
    const seed = [
      { a: 'warfarin', b: 'ibuprofen', severity: 'high', summary: 'يزود خطر النزيف' },
      { a: 'warfarin', b: 'aspirin', severity: 'high', summary: 'يزود خطر النزيف' },
      { a: 'metformin', b: 'alcohol', severity: 'medium', summary: 'يزود خطر الحماض اللبني' },
      { a: 'isotretinoin', b: 'vitamin a', severity: 'medium', summary: 'يزود السمية' }
    ]
    const stmt = await db.prepare('INSERT INTO interaction_rules(a_active, b_active, severity, summary) VALUES (?,?,?,?)')
    try {
      for (const r of seed) await stmt.run(r.a, r.b, r.severity, r.summary)
    } finally {
      await stmt.finalize()
    }
  }

  const pcount = await db.get<{ c: number }>('SELECT COUNT(1) as c FROM pharmacies')
  if ((pcount?.c ?? 0) === 0) {
    await db.run(`INSERT INTO pharmacies (name, address, phone, gps_lat, gps_lng) VALUES (?,?,?,?,?)`, ['صيدلية العزبي - El Ezaby', '15 شارع قصر النيل، القاهرة', '19011', 30.0444, 31.2357])
    await db.run(`INSERT INTO pharmacies (name, address, phone, gps_lat, gps_lng) VALUES (?,?,?,?,?)`, ['صيدليات سيف - Seif Pharmacies', '22 شارع جامعة الدول، الجيزة', '19199', 30.0511, 31.2001])
    await db.run(`INSERT INTO pharmacies (name, address, phone, gps_lat, gps_lng) VALUES (?,?,?,?,?)`, ['Smart Pharmacy Partner', 'بجوارك تماماً', '0100000000', 30.0450, 31.2360])
  }
}
