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

ensureCoreTables().catch(err => {
  console.error('Database initialization failed:', err)
})

app.set('trust proxy', 1)

app.use(requestContext)

app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    log('info', 'request', { 
      requestId: req.ctx?.requestId, 
      method: req.method, 
      path: req.path, 
      status: res.statusCode, 
      ms 
    })
  })
  next()
})

app.use(securityHeaders)
app.use(rateLimit)
app.use(corsConfig)

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 },
}))

app.get('/', (_req, res) => {
  res.json({ ok: true, name: 'smartpharmacy-api', base: '/api' })
})

app.use('/api', apiRoutes)

app.use(errorHandler)

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

export default app
