import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// تهيئة قاعدة البيانات
async function setupPharmacyDB() {
    const db = await open({
        filename: './database.sqlite', // تأكد أن هذا هو نفس اسم قاعدة بياناتك الحالية
        driver: sqlite3.Database
    });

    console.log("🔌 Connected to database...");

    // 1. إنشاء جدول الصيدليات (Pharmacies Table)
    // يضم: الاسم، العنوان، الموقع الجغرافي (Lat, Lng)، ورقم الهاتف
    await db.exec(`
        CREATE TABLE IF NOT EXISTS pharmacies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            gps_lat REAL,
            gps_lng REAL,
            logo_url TEXT
        );
    `);
    console.log("✅ Pharmacies table created.");

    // 2. إنشاء جدول مخزون الصيدليات (Pharmacy Stock)
    // هذا الجدول يربط الدواء (drug_id) بالصيدلية (pharmacy_id) ويحدد السعر والكمية
    await db.exec(`
        CREATE TABLE IF NOT EXISTS pharmacy_stock (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pharmacy_id INTEGER,
            drug_trade_name TEXT, -- سنربط بالاسم التجاري للسهولة حالياً
            price REAL,
            stock_quantity INTEGER DEFAULT 10,
            FOREIGN KEY(pharmacy_id) REFERENCES pharmacies(id)
        );
    `);
    console.log("✅ Pharmacy Stock table created.");

    // --- 3. إضافة بيانات تجريبية (Seeding) ---

    // التحقق هل توجد صيدليات مسبقاً؟
    const existing = await db.get("SELECT count(*) as count FROM pharmacies");

    if (existing.count === 0) {
        console.log("🌱 Seeding fake pharmacies...");

        // إضافة صيدلية العزبي (فرع افتراضي في وسط البلد)
        await db.run(`INSERT INTO pharmacies (name, address, phone, gps_lat, gps_lng) VALUES 
        ('صيدلية العزبي - El Ezaby', '15 شارع قصر النيل، القاهرة', '19011', 30.0444, 31.2357)`);

        // إضافة صيدلية سيف (فرع افتراضي في المهندسين)
        await db.run(`INSERT INTO pharmacies (name, address, phone, gps_lat, gps_lng) VALUES 
        ('صيدليات سيف - Seif Pharmacies', '22 شارع جامعة الدول، الجيزة', '19199', 30.0511, 31.2001)`);

        // إضافة صيدلية "Smart" (فرع قريب)
        await db.run(`INSERT INTO pharmacies (name, address, phone, gps_lat, gps_lng) VALUES 
        ('Smart Pharmacy Partner', 'بجوارك تماماً', '0100000000', 30.0450, 31.2360)`);

        console.log("✅ Fake pharmacies added.");

        // --- ربط الأدوية بالصيدليات ---
        // سنفترض أن هذه الصيدليات تبيع "Panadol" و "Xithrone"

        // العزبي يبيع بنادول بـ 45 جنيه
        await db.run(`INSERT INTO pharmacy_stock (pharmacy_id, drug_trade_name, price) VALUES (1, 'Panadol', 45.00)`);
        // العزبي يبيع زيثرون بـ 80 جنيه
        await db.run(`INSERT INTO pharmacy_stock (pharmacy_id, drug_trade_name, price) VALUES (1, 'Xithrone', 80.00)`);

        // سيف يبيع بنادول بسعر أرخص (عرض) بـ 40 جنيه
        await db.run(`INSERT INTO pharmacy_stock (pharmacy_id, drug_trade_name, price) VALUES (2, 'Panadol', 40.00)`);

        console.log("✅ Stock data linked.");
    } else {
        console.log("ℹ️ Pharmacies already exist. Skipping seed.");
    }

    console.log("🚀 Database Infrastructure Ready for Track 2!");
}

setupPharmacyDB().catch(err => {
    console.error("❌ Error setting up DB:", err);
});