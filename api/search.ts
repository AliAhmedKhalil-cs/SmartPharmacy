import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleCors, enableCors, searchDrugs } from './_util'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return
  
  try {
    const q = String(req.query.q || '').trim()
    
    if (!q) {
      enableCors(res)
      return res.status(400).json({ error: 'Query parameter required' })
    }
    
    // Call your search function from _util
    const results = await searchDrugs(q)
    
    enableCors(res)
    res.status(200).json(results)
  } catch (error: any) {
    console.error('Search error:', error)
    enableCors(res)
    res.status(500).json({ error: { message: error.message || 'Search failed' } })
  }
}
