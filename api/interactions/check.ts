import { norm, readJsonBody, sendError, sendOk } from '../_util'

type Item = { trade_name: string, active_ingredient: string }
type Severity = 'low' | 'medium' | 'high'

const rules: Array<{ a: string, b: string, severity: Severity, summary: string }> = [
  { a: 'warfarin', b: 'ibuprofen', severity: 'high', summary: 'يزود خطر النزيف' },
  { a: 'warfarin', b: 'aspirin', severity: 'high', summary: 'يزود خطر النزيف' },
  { a: 'metformin', b: 'alcohol', severity: 'medium', summary: 'يزود خطر الحماض اللبني' },
  { a: 'isotretinoin', b: 'vitamin a', severity: 'medium', summary: 'يزود السمية' }
]

function score(s: Severity) {
  if (s === 'high') return 3
  if (s === 'medium') return 2
  return 1
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  const body = await readJsonBody(req)
  const items = Array.isArray(body?.items) ? body.items : []
  if (items.length < 2) return sendError(res, 400, 'BAD_REQUEST', 'Invalid items')

  const cleaned: Item[] = items.map((x: any) => ({
    trade_name: String(x?.trade_name || '').trim(),
    active_ingredient: String(x?.active_ingredient || '').trim()
  })).filter(x => x.trade_name && x.active_ingredient).slice(0, 12)

  if (cleaned.length < 2) return sendError(res, 400, 'BAD_REQUEST', 'Invalid items')

  const hits: any[] = []
  for (let i = 0; i < cleaned.length; i++) {
    for (let j = i + 1; j < cleaned.length; j++) {
      const a = cleaned[i]
      const b = cleaned[j]
      const aN = norm(a.active_ingredient)
      const bN = norm(b.active_ingredient)
      const rule = rules.find(r => (r.a === aN && r.b === bN) || (r.a === bN && r.b === aN))
      if (rule) hits.push({ a, b, severity: rule.severity, summary: rule.summary })
    }
  }

  hits.sort((x, y) => score(y.severity) - score(x.severity))
  return sendOk(res, { hits })
}
