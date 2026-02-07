import("dotenv/config").then(async () => {
  const { Client } = await import("pg");
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  try {
    console.log("A) إعادة إنشاء price_backup (آمن)...");
    await c.query(`DROP TABLE IF EXISTS public.price_backup`);
    await c.query(`
      CREATE TABLE public.price_backup (
        drug_id integer PRIMARY KEY,
        avg_price numeric
      );
    `);
    await c.query(`
      INSERT INTO public.price_backup(drug_id, avg_price)
      SELECT drug_id, avg_price FROM public.drugs
      WHERE avg_price IS NOT NULL;
    `);
    console.log("تم إنشاء النسخة الاحتياطية.");

    console.log("B) التأكد من وجود العمود price_source...");
    const col = await c.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='drugs' AND column_name='price_source'
    `);
    if (col.rows.length === 0) {
      await c.query(`ALTER TABLE public.drugs ADD COLUMN price_source text`);
      console.log("تم إضافة العمود price_source.");
    } else {
      console.log("العمود price_source موجود.");
    }

    console.log("C) ملء الأسعار بناءً على متوسط active_ingredient (bulk)...");
    const r1 = await c.query(`
      WITH sub AS (
        SELECT active_ingredient, ROUND(AVG(avg_price)::numeric,2) AS avgp
        FROM public.drugs
        WHERE avg_price IS NOT NULL AND active_ingredient IS NOT NULL
        GROUP BY active_ingredient
      )
      UPDATE public.drugs d
      SET avg_price = sub.avgp, price_source = 'estimated_ai'
      FROM sub
      WHERE d.active_ingredient = sub.active_ingredient
        AND d.avg_price IS NULL
      RETURNING d.drug_id;
    `);
    console.log("تم تحديث (active_ingredient):", r1.rowCount);

    console.log("D) ملء الأسعار لباقي السجلات باستخدام متوسط أقرب أسماء (similarity)...");
    const r2 = await c.query(`
      WITH candidates AS (
        SELECT d1.drug_id, d1.trade_name
        FROM public.drugs d1
        WHERE d1.avg_price IS NULL
      ),
      est AS (
        SELECT c.drug_id,
          (
            SELECT ROUND(AVG(avg_price)::numeric,2)
            FROM (
              SELECT avg_price
              FROM public.drugs
              WHERE avg_price IS NOT NULL
              ORDER BY similarity(lower(trade_name), lower(c.trade_name)) DESC
              LIMIT 8
            ) t
          ) AS est_price
        FROM candidates c
      )
      UPDATE public.drugs d
      SET avg_price = est.est_price, price_source = 'estimated_sim'
      FROM est
      WHERE d.drug_id = est.drug_id
        AND est.est_price IS NOT NULL
      RETURNING d.drug_id;
    `);
    console.log("تم تحديث (similarity):", r2.rowCount);

    const remaining = await c.query(`SELECT COUNT(*)::int AS cnt FROM public.drugs WHERE avg_price IS NULL`);
    console.log("عدد السجلات المتبقية بدون سعر (avg_price IS NULL):", remaining.rows[0].cnt);

    const totalUpdated = r1.rowCount + r2.rowCount;
    console.log("المجموع الإجمالي للسجلات المحدثة:", totalUpdated);
  } catch (e) {
    console.error("خطأ أثناء التنفيذ:", e);
  } finally {
    await c.end();
    process.exit(0);
  }
});
