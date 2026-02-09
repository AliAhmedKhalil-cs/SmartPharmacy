import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleCors, sendError, sendOk, searchDrugs } from './_util'

export const config = {
  runtime: 'nodejs'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return
  
  if (req.method !== 'GET') {
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET allowed')
  }
  
  try {
    const q = String(req.query.q || '').trim()
    
    if (!q) {
      return sendError(res, 400, 'BAD_REQUEST', 'Query parameter "q" is required')
    }
    
    const results = await searchDrugs(q)
    return sendOk(res, results)
  } catch (error: any) {
    console.error('Search error:', error)
    return sendError(res, 500, 'INTERNAL_ERROR', error.message || 'Search failed')
  }
}
