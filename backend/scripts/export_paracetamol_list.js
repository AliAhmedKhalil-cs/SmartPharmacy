import("dotenv/config").then(async () => {
  const { Client } = await import("pg");
  const fs = await import("fs/promises");
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false} });
  await client.connect();
  try {
    const r = await client.query("SELECT drug_id, trade_name, active_ingredient FROM public.drugs WHERE lower(active_ingredient) LIKE '%paracetamol%'");
    const header = 'drug_id,trade_name,active_ingredient\r\n';
    const lines = r.rows.map(x=>`${x.drug_id},"${(x.trade_name||'').replace(/"/g,'""')}","${(x.active_ingredient||'').replace(/"/g,'""')}"`).join('\r\n');
    await fs.writeFile('./data/paracetamol_drugs.csv', header + lines, 'utf8');
    console.log('wrote ./data/paracetamol_drugs.csv rows=', r.rowCount);
  } catch(e){ console.error(e); }
  finally{ await client.end(); process.exit(0); }
});
