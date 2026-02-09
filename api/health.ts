import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sendOk, enableCors } from './_util'

export const config = {
  runtime: 'nodejs'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  enableCors(res)
  return sendOk(res, { 
    ok: true, 
    status: 'healthy',
    timestamp: new Date().toISOString() 
  })
}
