import express from 'express'
import fileUpload from 'express-fileupload'
import dotenv from 'dotenv'
import apiRoutes from './routes/api.js'
import { corsConfig, rateLimit, securityHeaders } from './middleware/security.js'
import { requestContext } from './middleware/requestContext.js'
import { errorHandler } from './middleware/errorHandler.js'
import { ensureCoreTables } from './db/sqlite.js'
import { log } from './lib/logger.js'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT || 3000)

app.set('trust proxy', 1)

app.use(requestContext)

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    log('info', 'request', { requestId: req.ctx?.requestId, method: req.method, path: req.path, status: res.statusCode, ms })
  })
  next()
})

app.use(securityHeaders)
app.use(rateLimit)
app.use(corsConfig)

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
  abortOnLimit: true,
  createParentPath: true
}))

app.get('/', (_req, res) => {
  res.json({ ok: true, name: 'smartpharmacy-api', base: '/api' })
})

app.use('/api', apiRoutes)
app.use(errorHandler)

ensureCoreTables()
  .then(() => {
    const start = (port: number) => {
      const server = app.listen(port, '127.0.0.1', () => { log('info', 'server_started', { port }) })
      server.on('error', (err: any) => {
        const code = err?.code ? String(err.code) : ''
        if ((code === 'EACCES' || code === 'EADDRINUSE') && port === PORT) {
          const nextPort = PORT + 1
          log('error', 'port_unavailable', { port, nextPort, code })
          start(nextPort)
          return
        }
        log('error', 'server_failed', { message: err instanceof Error ? err.message : String(err) })
        process.exit(1)
      })
    }
    start(PORT)
  })
  .catch((e) => {
    log('error', 'server_failed', { message: e instanceof Error ? e.message : String(e) })
    process.exit(1)
  })
