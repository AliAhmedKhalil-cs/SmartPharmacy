import type { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'

export type RequestContext = { requestId: string }

declare module 'express-serve-static-core' {
  interface Request { ctx?: RequestContext }
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = String(req.headers['x-request-id'] ?? '').trim()
  const requestId = incoming || crypto.randomUUID()
  req.ctx = { requestId }
  res.setHeader('x-request-id', requestId)
  next()
}
