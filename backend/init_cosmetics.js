import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

async function setupCosmeticsDB() {
    const db = await open({
        filename: './database.sqlite', // نفس قاعدة البيانات الحالية
        driver: sqlite3.Database
    });

    console.log("💄 Setting up Cosmetics Database...");

    // 1. إنشاء الجدول
    await db.exec(`
        CREATE TABLE IF NOT EXISTS cosmetics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT,          -- الماركة (مثلاً: Cerave)
            category TEXT,       -- التصنيف (Skin Care, Hair Care)
            price REAL,
            skin_type TEXT,      -- نوع البشرة المناسب (Oily, Dry, All)
            description TEXT
        );
    `);
    console.log("✅ Cosmetics table created.");

    // 2. إضافة منتجات تجريبية (Seeding)
    const count = await db.get("SELECT count(*) as count FROM cosmetics");

    if (count.count === 0) {
        console.log("🌱 Adding popular products...");

        await db.run(`INSERT INTO cosmetics (name, brand, category, price, skin_type, description) VALUES 
        ('Cerave Foaming Cleanser', 'Cerave', 'Skin Care', 350, 'Oily/Normal', 'غسول رغوي للبشرة العادية إلى الدهنية، ينظف ويزيل الزيوت دون الإخلال بحاجز البشرة.'),
        ('La Roche-Posay Anthelios 50+', 'La Roche-Posay', 'Sun Care', 420, 'Sensitive', 'واقي شمس سائل خفي الملمس بمعامل حماية عالي جداً للبشرة الحساسة.'),
        ('Vichy Mineral 89', 'Vichy', 'Skin Care', 550, 'All', 'سيروم يومي لتعزيز قوة البشرة وترطيبها، غني بمياه فيشي البركانية.'),
        ('Loreal Hyaluron Expert Serum', 'Loreal', 'Skin Care', 220, 'All', 'سيروم حمض الهيالورونيك لترطيب البشرة وملء الخطوط الدقيقة.'),
        ('Garnier Micellar Water', 'Garnier', 'Cleanser', 120, 'Sensitive', 'ماء ميسيلار منظف للوجه ومزيل للمكياج، لطيف على البشرة الحساسة.')
        `);

        console.log("✅ Fake cosmetics added.");
    } else {
        console.log("ℹ️ Cosmetics already exist.");
    }
}

setupCosmeticsDB().catch(err => {
    console.error("❌ Error:", err);
});