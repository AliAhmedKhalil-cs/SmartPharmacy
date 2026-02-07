import("dotenv/config").then(async () => {
  const fs = await import("fs/promises");
  const path = await import("path");
  const { Client } = await import("pg");

  const csvPath = process.argv[2] || './data/prices.csv';
  const threshold = Number(process.argv[3] || 0.45);

  const text = await fs.readFile(path.resolve(csvPath), 'utf8');
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  const header = lines.shift().split(',').map(h=>h.trim().toLowerCase());
  const idxName = header.indexOf('trade_name') >=0 ? header.indexOf('trade_name') : header.indexOf('name');
  const idxPrice = header.indexOf('avg_price') >=0 ? header.indexOf('avg_price') : header.indexOf('price');
  if(idxName===-1 || idxPrice===-1){ console.error('CSV must include trade_name and avg_price'); process.exit(2); }

  const rows = lines.map(l=>{
    const parts = l.split(','); return { name: parts[idxName]?.trim(), price: Number(parts[idxPrice]||'') };
  }).filter(r=>r.name && isFinite(r.price));

  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });
  await client.connect();
  try {
    const out = ['price_name,price,matched_drug_id,matched_trade_name,similarity'];
    for(const r of rows){
      const q = await client.query(
        `SELECT drug_id, trade_name, similarity(lower(trade_name), lower($1)) AS sim
         FROM public.drugs
         ORDER BY sim DESC
         LIMIT 1`, [r.name]
      );
      if(q.rows.length){
        const m = q.rows[0];
        if(Number(m.sim) >= threshold){
          out.push(`"${r.name.replace(/"/g,'""')}",${r.price},${m.drug_id},"${(m.trade_name||'').replace(/"/g,'""')}",${m.sim}`);
        } else {
          out.push(`"${r.name.replace(/"/g,'""')}",${r.price},,,"${m.sim}"`);
        }
      } else {
        out.push(`"${r.name.replace(/"/g,'""')}",${r.price},,,`);
      }
    }
    await fs.writeFile('./data/review_price_matches.csv', out.join('\r\n'), 'utf8');
    console.log('wrote ./data/review_price_matches.csv rows=', out.length-1);
  } catch(e){ console.error(e); }
  finally{ await client.end(); process.exit(0); }
});
