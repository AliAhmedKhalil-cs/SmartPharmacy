const fileEl = document.getElementById('file');
const previewBtn = document.getElementById('previewBtn');
const applyBtn = document.getElementById('applyBtn');
const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');

function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  const header = lines.shift().split(',').map(h=>h.trim().toLowerCase());
  const idxName = header.indexOf('trade_name');
  const idxAi = header.indexOf('active_ingredient');
  const idxImg = header.indexOf('image_url');
  const idxPrice = header.indexOf('avg_price') >= 0 ? header.indexOf('avg_price') : header.indexOf('price');
  if(idxName === -1) throw new Error('CSV must include trade_name header');
  return lines.map(l=>{
    const cols = l.split(',');
    return {
      trade_name: cols[idxName]?.trim(),
      active_ingredient: idxAi>=0 ? (cols[idxAi]?.trim()||null) : null,
      image_url: idxImg>=0 ? (cols[idxImg]?.trim()||null) : null,
      avg_price: idxPrice>=0 ? Number(cols[idxPrice]||'') || null : null
    };
  }).filter(r=>r.trade_name);
}

async function preview(rows){
  statusEl.textContent = 'جاري تحليل الاقتراحات...';
  const res = await fetch('/api/admin/preview', {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({ rows, threshold: 0.45 })
  });
  const data = await res.json();
  statusEl.textContent = 'انتهى التحليل';
  renderPreviewTable(data.rows, rows);
}

function renderPreviewTable(suggestions, originalRows){
  previewEl.innerHTML = '';
  const table = document.createElement('table');
  table.innerHTML = `<thead><tr><th>خيار</th><th>input name</th><th>best match</th><th>sim</th><th>price</th><th>active_ingredient</th></tr></thead>`;
  const tb = document.createElement('tbody');
  suggestions.forEach(s=>{
    const tr = document.createElement('tr');
    const chk = document.createElement('input'); chk.type='checkbox'; chk.checked = s.accepts;
    tr.appendChild(td(() => chk));
    tr.appendChild(td(() => s.trade_name));
    tr.appendChild(td(() => s.best_match ? `${s.best_match.trade_name} (${s.best_match.drug_id})` : 'لا يوجد'));
    tr.appendChild(td(() => s.best_match ? s.best_match.sim.toFixed(3) : '-'));
    tr.appendChild(td(() => s.avg_price ?? ''));
    tr.appendChild(td(() => s.active_ingredient ?? ''));
    tr._suggest = s; tr._checkbox = chk;
    tb.appendChild(tr);
  });
  table.appendChild(tb);
  previewEl.appendChild(table);
  applyBtn.disabled = false;
  applyBtn.onclick = async ()=>{
    const actions = [];
    Array.from(tb.children).forEach(tr=>{
      if(tr._checkbox && tr._checkbox.checked && tr._suggest && tr._suggest.best_match){
        actions.push({
          drug_id: tr._suggest.best_match.drug_id,
          avg_price: tr._suggest.avg_price ?? null,
          active_ingredient: tr._suggest.active_ingredient ?? null,
          image_url: tr._suggest.image_url ?? null,
          price_source: 'imported_admin'
        });
      }
    });
    if(!actions.length){ alert('لا اختيارات لتطبيقها'); return; }
    statusEl.textContent = 'جاري تطبيق التعديلات...';
    const r = await fetch('/api/admin/apply', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ actions })});
    const jr = await r.json();
    statusEl.textContent = 'تم التطبيق, updated=' + (jr.updated ?? 0);
    applyBtn.disabled = true;
  };
}

function td(cb){ const td = document.createElement('td'); td.appendChild(cb()); return td; }

previewBtn.onclick = async ()=>{
  if(!fileEl.files || !fileEl.files[0]){ alert('اختر ملف CSV'); return; }
  const f = fileEl.files[0];
  const text = await f.text();
  let rows;
  try { rows = parseCSV(text); } catch(e){ alert(e.message); return; }
  await preview(rows);
};
