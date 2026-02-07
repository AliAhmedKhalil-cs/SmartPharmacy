import { safeInt, sendError, sendOk } from '../_util'

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  const trade_name = String(req.query?.trade_name || '').trim()
  const days = safeInt(req.query?.days, 1, 60) || 14
  if (!trade_name) return sendError(res, 400, 'BAD_REQUEST', 'Invalid query')

  const now = Date.now()
  const points = Array.from({ length: days }).map((_, i) => {
    const date = new Date(now + i * 86400000).toISOString().slice(0, 10)
    const base = 8 + Math.round(Math.random() * 6)
    const seasonal = (new Date().getMonth() <= 1 || new Date().getMonth() >= 10) ? 3 : 0
    return { date, predicted_qty: base + seasonal }
  })

  return sendOk(res, { trade_name, days, points })
}
