import { loadDrugs, norm, sendError, sendOk } from './_util'

const pharmacies = [
  { pharmacy_id: 1, name: 'صيدلية العزبي - El Ezaby', address: 'القاهرة', priceFactor: 1.05 },
  { pharmacy_id: 2, name: 'صيدليات سيف - Seif Pharmacies', address: 'الجيزة', priceFactor: 1.0 },
  { pharmacy_id: 3, name: 'Smart Pharmacy Partner', address: 'بجوارك', priceFactor: 0.98 }
]

function locationsFor(tradeName: string, avgPrice?: number) {
  const base = Number.isFinite(avgPrice as any) ? Number(avgPrice) : 0
  const seed = norm(tradeName).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const out: any[] = []
  for (const p of pharmacies) {
    const available = (seed + p.pharmacy_id) % 3 !== 0
    if (!available) continue
    const price = base ? Math.max(5, Math.round(base * p.priceFactor)) : null
    out.push({ pharmacy_id: p.pharmacy_id, name: p.name, address: p.address, price })
  }
  return out
}

function alternatives(drugs: any[], active: string, trade: string, avgPrice?: number) {
  const activeN = norm(active)
  const base = Number.isFinite(avgPrice as any) ? Number(avgPrice) : undefined
  const candidates = drugs.filter(d => norm(d.active_ingredient) === activeN && norm(d.trade_name) !== norm(trade))
  if (!candidates.length) return []
  const scored = candidates.map(d => {
    const p = Number.isFinite(d.avg_price as any) ? Number(d.avg_price) : undefined
    const delta = base !== undefined && p !== undefined ? Math.abs(p - base) : 9999
    return { d, delta }
  }).sort((a, b) => a.delta - b.delta)
  return scored.slice(0, 6).map(x => x.d)
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  const q = String(req.query?.q || '').trim()
  if (!q) return sendOk(res, [])
  const qn = norm(q)
  const drugs = await loadDrugs()
  const hits = drugs.filter(d => norm(d.trade_name).includes(qn) || norm(d.active_ingredient).includes(qn)).slice(0, 20)

  const out = hits.map(d => {
    const alts = alternatives(drugs, d.active_ingredient, d.trade_name, d.avg_price)
    return {
      ...d,
      type: 'medication',
      alternatives: alts,
      available_locations: locationsFor(d.trade_name, d.avg_price)
    }
  })

  return sendOk(res, out)
}
