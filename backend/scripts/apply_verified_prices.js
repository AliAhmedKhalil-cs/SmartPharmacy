import("dotenv/config").then(async () => {
  const fs = await import("fs/promises");
  const path = await import("path");
  const { Client } = await import("pg");
  const csvPath = process.argv[2] || './data/verified_price_mappings.csv';
  const text = await fs.readFile(path.resolve(csvPath), 'utf8');
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  const header = lines.shift().split(',').map(h=>h.trim().toLowerCase());
  const idxId = header.indexOf('drug_id');
  const idxPrice = header.indexOf('avg_price')>=0 ? header.indexOf('avg_price') : header.indexOf('price');
  if(idxId===-1 || idxPrice===-1){ console.error('CSV must include drug_id and avg_price'); process.exit(2); }
  const rows = lines.map(l=>l.split(',')).map(cols=>({ id: Number(cols[idxId]), price: Number(cols[idxPrice]) })).filter(r=>Number.isFinite(r.id) && Number.isFinite(r.price));
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });
  await client.connect();
  try {
    // temp table
    await client.query('CREATE TEMP TABLE tmp_prices(drug_id integer, avg_price numeric)');
    const batch = 200;
    for(let i=0;i<rows.length;i+=batch){
      const chunk=rows.slice(i,i+batch);
      const params = [];
      const vals = chunk.map((r,j)=>{ params.push(r.id); params.push(r.price); return `($${params.length-1}, $${params.length})`.replace(/\$(\d+)/g,(m,p)=>`$${p}`); });
      // build placeholders properly
      const placeholders = chunk.map((_,j)=>`($${j*2+1}, $${j*2+2})`).join(',');
      const flat = chunk.flatMap(r=>[r.id,r.price]);
      await client.query(`INSERT INTO tmp_prices(drug_id, avg_price) VALUES ${placeholders}`, flat);
    }
    // update main table
    const res = await client.query(`UPDATE public.drugs d SET avg_price = t.avg_price, price_source='imported_verified' FROM tmp_prices t WHERE d.drug_id = t.drug_id RETURNING d.drug_id`);
    console.log('updated rows:', res.rowCount);
  } catch(e){ console.error(e); }
  finally{ await client.end(); process.exit(0); }
});
