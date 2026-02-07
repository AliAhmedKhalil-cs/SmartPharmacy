import type { Request, Response, NextFunction } from 'express'
import { log } from '../lib/logger.js'

export class ApiError extends Error {
  status: number
  code: string
  constructor(status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.ctx?.requestId
  const e = err instanceof ApiError ? err : new ApiError(500, 'INTERNAL_ERROR', 'Unexpected error')
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : typeof err === 'string' ? err : undefined
  log('error', 'request_failed', { requestId, path: req.path, method: req.method, status: e.status, code: e.code, message: e.message, detail })
  res.status(e.status).json({ error: { code: e.code, message: e.message, requestId } })
}
