import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// تحديث الأسعار لتطابق السوق المصري 2024/2025
const realEgyptianDrugs = [
    // مسكنات وحرارة (Updated Prices)
    { name: "Adol 500mg", active: "Paracetamol", form: "Tablets", price: 32.00, group: "Analgesic" }, // تم التحديث بناءً على طلبك
    { name: "Adol Extra", active: "Paracetamol", form: "Tablets", price: 45.00, group: "Analgesic" },
    { name: "Panadol Extra", active: "Paracetamol", form: "Tablets", price: 55.00, group: "Analgesic" }, // سعر السوق الحالي
    { name: "Panadol Advance", active: "Paracetamol", form: "Tablets", price: 45.00, group: "Analgesic" },
    { name: "Panadol Cold & Flu", active: "Paracetamol", form: "Tablets", price: 65.00, group: "Cold & Flu" },
    { name: "Abimol", active: "Paracetamol", form: "Tablets", price: 16.00, group: "Analgesic" },
    { name: "Cetal", active: "Paracetamol", form: "Tablets", price: 18.00, group: "Analgesic" },

    // فيتامينات وأعصاب (Updated Prices)
    { name: "Milga", active: "Benfotiamine", form: "Tablets", price: 108.00, group: "Vitamin" }, // تم التحديث بناءً على طلبك
    { name: "Milga Advance", active: "Benfotiamine", form: "Tablets", price: 130.00, group: "Vitamin" },
    { name: "Neuroton", active: "Vitamin B Complex", form: "Tablets", price: 81.00, group: "Vitamin" },
    { name: "Neurovit", active: "Vitamin B Complex", form: "Tablets", price: 69.00, group: "Vitamin" },
    { name: "Kerovit", active: "Multivitamins", form: "Capsules", price: 95.00, group: "Vitamin" },

    // مضادات حيوية (Prices increased significantly)
    { name: "Augmentin 1g", active: "Amoxicillin", form: "Tablets", price: 135.00, group: "Antibiotic" },
    { name: "Augmentin 625mg", active: "Amoxicillin", form: "Tablets", price: 90.00, group: "Antibiotic" },
    { name: "Hibiotic 1g", active: "Amoxicillin", form: "Tablets", price: 105.00, group: "Antibiotic" },
    { name: "Curam 1g", active: "Amoxicillin", form: "Tablets", price: 110.00, group: "Antibiotic" },
    { name: "Zithromax", active: "Azithromycin", form: "Capsules", price: 115.00, group: "Antibiotic" },

    // طوارئ وحالات حرجة
    { name: "Adrenaline", active: "Epinephrine", form: "Ampoules", price: 35.00, group: "Emergency" },
    { name: "Lasix", active: "Furosemide", form: "Ampoules", price: 28.00, group: "Diuretic" },

    // معدة وهضم
    { name: "Antinal", active: "Nifuroxazide", form: "Capsules", price: 38.00, group: "Antidiarrheal" },
    { name: "Spasmo-Digestin", active: "Digestive Enzymes", form: "Tablets", price: 58.00, group: "Digestive" },
    { name: "Nexium 40mg", active: "Esomeprazole", form: "Tablets", price: 220.00, group: "Antacid" }, // زيادة كبيرة
    { name: "Controloc 40mg", active: "Pantoprazole", form: "Tablets", price: 195.00, group: "Antacid" },
    { name: "Antodine 40", active: "Famotidine", form: "Tablets", price: 48.00, group: "Antacid" },

    // عظام والتهابات
    { name: "Alphintern", active: "Trypsin", form: "Tablets", price: 72.00, group: "Anti-inflammatory" },
    { name: "Ambezim-G", active: "Trypsin", form: "Tablets", price: 65.00, group: "Anti-inflammatory" },
    { name: "Voltaren 100", active: "Diclofenac Sodium", form: "Suppositories", price: 85.00, group: "Anti-inflammatory" },
    { name: "Cataflam 50", active: "Diclofenac Potassium", form: "Tablets", price: 80.00, group: "Analgesic" },
    { name: "Brufen 400", active: "Ibuprofen", form: "Tablets", price: 68.00, group: "Anti-inflammatory" },
    { name: "Brufen 600", active: "Ibuprofen", form: "Tablets", price: 78.00, group: "Anti-inflammatory" },

    // ضغط وقلب
    { name: "Concor 5", active: "Bisoprolol", form: "Tablets", price: 90.00, group: "Antihypertensive" },
    { name: "Concor 2.5", active: "Bisoprolol", form: "Tablets", price: 75.00, group: "Antihypertensive" },
    { name: "Atacand 16", active: "Candesartan", form: "Tablets", price: 165.00, group: "Antihypertensive" }
];

// المولد العشوائي لباقي الأصناف (تم رفع متوسط الأسعار ليحاكي التضخم)
const commonGenerics = [
    { active: "Paracetamol", brands: ["Paramol", "Pyral", "Cetamol", "Nova-C"], group: "Analgesic" },
    { active: "Ibuprofen", brands: ["Marcofen", "Ultrafen", "Megafen"], group: "Anti-inflammatory" },
    { active: "Amoxicillin", brands: ["Biomox", "E-Mox", "Amoxil"], group: "Antibiotic" },
    { active: "Diclofenac", brands: ["Declophen", "Rheumafen", "Dolphin"], group: "Analgesic" },
    { active: "Loratadine", brands: ["Mosedin", "Claritine", "Loran"], group: "Antihistamine" },
    { active: "Metformin", brands: ["Cidophage", "Glucophage", "Amophage"], group: "Antidiabetic" },
    { active: "Omeprazole", brands: ["Gastroloc", "Omepak", "Risek"], group: "Antacid" }
];

const forms = ["Tablets", "Syrup", "Capsules", "Ampoules", "Gel", "Cream", "Drops"];
const strengths = ["10mg", "20mg", "50mg", "100mg", "500mg", "1000mg"];

async function seedDatabase() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'pharmacy_system'
    });

    console.log("🚀 Connected. Updating database with 2025 Market Prices...");

    await connection.execute("SET SQL_SAFE_UPDATES = 0");
    await connection.execute("DELETE FROM drugs");
    await connection.execute("ALTER TABLE drugs AUTO_INCREMENT = 1");

    let drugsBatch: any[] = [];
    const batchSize = 1000;

    // 1. إدخال القائمة الحقيقية المحدثة
    for (const drug of realEgyptianDrugs) {
        drugsBatch.push([drug.name, drug.active, drug.form, drug.price, drug.group]);
    }

    // 2. توليد الباقي بأسعار "محدثة" (تضخم)
    const target = 10000;
    let currentCount = drugsBatch.length;

    while (currentCount < target) {
        const generic = commonGenerics[Math.floor(Math.random() * commonGenerics.length)];
        const baseName = Math.random() > 0.3
            ? generic.brands[Math.floor(Math.random() * generic.brands.length)]
            : generic.active.substring(0, 4) + ["fen", "mol", "cin", "dine"].sort(() => 0.5 - Math.random())[0];

        const strength = strengths[Math.floor(Math.random() * strengths.length)];
        const form = forms[Math.floor(Math.random() * forms.length)];

        const fullName = `${baseName} ${strength}`;

        // رفعنا الحد الأدنى للسعر العشوائي من 10 إلى 30 ليواكب الغلاء
        const price = (Math.random() * 150 + 30).toFixed(2);

        drugsBatch.push([fullName, generic.active, form, price, generic.group]);
        currentCount++;

        if (drugsBatch.length >= batchSize) {
            const sql = "INSERT INTO drugs (trade_name, active_ingredient, form, avg_price, therapeutic_group) VALUES ?";
            await connection.query(sql, [drugsBatch]);
            console.log(`✅ Saved ${currentCount} drugs...`);
            drugsBatch = [];
        }
    }

    if (drugsBatch.length > 0) {
        const sql = "INSERT INTO drugs (trade_name, active_ingredient, form, avg_price, therapeutic_group) VALUES ?";
        await connection.query(sql, [drugsBatch]);
    }

    console.log("🎉 DONE! Prices updated to 2025 standards (Milga=108, Adol=32).");
    await connection.execute("SET SQL_SAFE_UPDATES = 1");
    await connection.end();
}

seedDatabase().catch(console.error);