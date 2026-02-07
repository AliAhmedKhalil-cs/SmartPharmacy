import { loadDrugs, norm, parsePatientContext, randomOrderCode, readJsonBody, sendError, sendOk } from '../_util'

const pharmacies = [
  { id: 1, name: 'صيدلية العزبي - El Ezaby', priceFactor: 1.05 },
  { id: 2, name: 'صيدليات سيف - Seif Pharmacies', priceFactor: 1.0 },
  { id: 3, name: 'Smart Pharmacy Partner', priceFactor: 0.98 }
]

type Order = any
const store: Map<string, Order> = (globalThis as any).__SP_ORDERS__ || new Map()
;(globalThis as any).__SP_ORDERS__ = store

function priceFor(trade: string, avgPrice?: number, factor?: number) {
  const base = Number.isFinite(avgPrice as any) ? Number(avgPrice) : 0
  if (!base) return null
  return Math.max(5, Math.round(base * (factor || 1)))
}

function availableFor(trade: string, pharmacyId: number) {
  const seed = norm(trade).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return (seed + pharmacyId) % 3 !== 0
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  const body = await readJsonBody(req)
  const pharmacyId = Number(body?.pharmacy_id || 0)
  const itemsIn = Array.isArray(body?.items) ? body.items : []
  if (!pharmacyId || !itemsIn.length) return sendError(res, 400, 'BAD_REQUEST', 'Invalid order')

  const pharmacy = pharmacies.find(p => p.id === pharmacyId)
  if (!pharmacy) return sendError(res, 404, 'NOT_FOUND', 'Pharmacy not found')

  const ctx = parsePatientContext(body?.context || {})
  const drugs = await loadDrugs()
  const code = randomOrderCode()

  const items = itemsIn.map((it: any) => {
    const trade = String(it?.trade_name || '').trim()
    const qty = Math.max(1, Math.min(99, Number(it?.qty || 1)))
    const drug = drugs.find(d => norm(d.trade_name) === norm(trade)) || drugs.find(d => norm(d.trade_name).includes(norm(trade)))
    const available = trade ? availableFor(trade, pharmacyId) : false
    const unitPrice = drug ? priceFor(drug.trade_name, drug.avg_price, pharmacy.priceFactor) : null
    return { trade_name: trade, qty, unit_price: unitPrice, available: !!available }
  }).filter(x => x.trade_name)

  const total = items.reduce((sum, x) => sum + (x.available && x.unit_price ? x.unit_price * x.qty : 0), 0)

  store.set(code, { order_code: code, pharmacy_id: pharmacyId, created_at: new Date().toISOString(), status: 'reserved', context: ctx, items, total })

  return sendOk(res, { ok: true, order_code: code, pharmacy_id: pharmacyId, items, total })
}
