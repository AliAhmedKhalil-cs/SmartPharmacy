import { norm, readJsonBody, sendError, sendOk } from '../_util'

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  const body = await readJsonBody(req)
  const active = String(body?.active_ingredient || '').trim()
  const allergens = Array.isArray(body?.allergens) ? body.allergens.map((x: any) => String(x || '').trim()).filter(Boolean) : []
  if (!active) return sendError(res, 400, 'BAD_REQUEST', 'Invalid allergy payload')

  const activeN = norm(active)
  const hits = allergens.map(norm).filter(a => a && activeN.includes(a))
  const risky = hits.length > 0

  return sendOk(res, {
    ok: true,
    risky,
    matched: hits,
    message: risky ? `تحذير: المادة الفعالة فيها/قريبة من (${hits.join('، ')})` : 'مفيش تعارض واضح من الحساسية اللي دخلتها'
  })
}
