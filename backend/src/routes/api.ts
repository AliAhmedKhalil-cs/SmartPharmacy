import { Router } from 'express'
import { z } from 'zod'
import dotenv from 'dotenv'
import { searchDrugs, findAlternatives } from '../services/drugSearch.js'
import { getDb } from '../db/sqlite.js'
import { allergyProfileSchema, checkAllergy } from '../services/allergy.js'
import { interactionRequestSchema, checkInteractions } from '../services/interactions.js'
import { forecastQuerySchema, forecastDemand } from '../services/inventory.js'
import { validatePrescription } from '../services/prescriptionValidator.js'
import { fallbackChatAnswer } from '../services/fallbackChat.js'
import { ApiError } from '../middleware/errorHandler.js'

// @ts-ignore
import fetch from 'node-fetch'

dotenv.config()

const router = Router()

const API_KEY = process.env.GEMINI_API_KEY || ''
const MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro']
const sleep = async (ms: number) => await new Promise(resolve => setTimeout(resolve, ms))

const patientContextSchema = z.object({
  age: z.number().int().min(0).max(120).optional(),
  sex: z.enum(['male', 'female', 'other']).optional(),
  weightKg: z.number().min(1).max(400).optional(),
  allergies: z.array(z.string().min(1).max(60)).max(40).optional(),
  conditions: z.array(z.string().min(1).max(60)).max(40).optional(),
  currentMeds: z.array(z.string().min(1).max(120)).max(40).optional()
}).partial()

const chatBodySchema = z.object({
  message: z.string().min(1).max(4000),
  context: patientContextSchema.optional()
})

const prescriptionValidateSchema = z.object({
  meds: z.array(z.string().min(1).max(160)).min(1).max(12),
  context: patientContextSchema.optional()
})

const reserveOrderSchema = z.object({
  pharmacy_id: z.number().int().positive(),
  items: z.array(z.object({
    trade_name: z.string().min(1).max(160),
    qty: z.number().int().min(1).max(20).optional()
  })).min(1).max(20),
  context: patientContextSchema.optional()
})

const searchQuerySchema = z.object({ q: z.string().min(1).max(120) })

async function callGemini(text: string, imageBuffer?: Buffer): Promise<string> {
  if (!API_KEY) throw new ApiError(503, 'AI_NOT_CONFIGURED', 'Missing GEMINI_API_KEY')
  let lastError: unknown
  for (const model of MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`
      const parts: any[] = [{ text }]
      if (imageBuffer) parts.push({ inline_data: { mime_type: 'image/jpeg', data: imageBuffer.toString('base64') } })
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '')
        if (response.status === 429) { await sleep(1000); continue }
        if (response.status === 400 && /API Key not found|API_KEY_INVALID/i.test(bodyText)) throw new ApiError(502, 'AI_AUTH_FAILED', 'Invalid GEMINI_API_KEY')
        if (response.status === 401 || response.status === 403) throw new ApiError(502, 'AI_AUTH_FAILED', 'Invalid GEMINI_API_KEY')
        throw new Error(`HTTP ${response.status}${bodyText ? ` ${bodyText}` : ''}`)
      }
      const data: any = await response.json()
      const out = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (typeof out === 'string' && out.trim()) return out
    } catch (e) {
      lastError = e
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI failed')
}

router.get('/health', async (_req, res) => {
  res.json({ ok: true })
})

router.post('/chat', async (req, res, next) => {
  const parsed = chatBodySchema.safeParse(req.body)
  if (!parsed.success) return next(new ApiError(400, 'BAD_REQUEST', 'Invalid message'))
  const ctx = parsed.data.context
  const userText = parsed.data.message

  const system = [
    'أنت مساعد صيدلي افتراضي. لا تقدم تشخيص ولا جرعات شخصية.',
    'قدّم معلومات عامة آمنة: استخدام، تداخلات، حساسية، تخزين، نصائح نمط حياة.',
    'لو في أعراض خطيرة أو شك في حساسية شديدة: وجّه لطبيب/طوارئ فورًا.',
    'اكتب بالعربي المصري البسيط وبشكل مختصر.'
  ].join('\n')

  const profileBits: string[] = []
  if (ctx?.age !== undefined) profileBits.push(`العمر: ${ctx.age}`)
  if (ctx?.sex) profileBits.push(`النوع: ${ctx.sex}`)
  if (ctx?.weightKg !== undefined) profileBits.push(`الوزن: ${ctx.weightKg} كجم`)
  if (ctx?.allergies?.length) profileBits.push(`الحساسية: ${ctx.allergies.join('، ')}`)
  if (ctx?.conditions?.length) profileBits.push(`الحالات: ${ctx.conditions.join('، ')}`)
  if (ctx?.currentMeds?.length) profileBits.push(`الأدوية الحالية: ${ctx.currentMeds.join('، ')}`)
  const profile = profileBits.length ? `

ملف المستخدم:
${profileBits.join('\n')}` : ''

  const prompt = `${system}

سؤال المستخدم: ${userText}${profile}`

  const fallbackOn = String(process.env.CHAT_FALLBACK || 'on').toLowerCase() !== 'off'

  try {
    const reply = await callGemini(prompt)
    return res.json({ reply, provider: 'gemini' })
  } catch (e) {
    const isAuth = e instanceof ApiError && (e.code === 'AI_AUTH_FAILED' || e.code === 'AI_NOT_CONFIGURED')
    if (fallbackOn) {
      const fb = fallbackChatAnswer(userText, ctx as any)
      return res.json({ reply: fb.text, provider: 'fallback', tags: fb.tags || [] })
    }
    if (isAuth) return next(e)
    return next(new ApiError(502, 'AI_DOWN', 'AI temporarily unavailable'))
  }
})


router.post('/ocr', async (req, res) => {
  const reqAny = req as any
  const file = reqAny.files?.image
  if (!file) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'No image' } })
  const mime = String(file.mimetype || '')
  if (!mime.startsWith('image/')) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid file type' } })
  try {
    const text = await callGemini('Extract trade names (medicines or cosmetics) as comma-separated list.', file.data)
    const names = text.replace(/[\[\]"`]/g, '').split(',').map((d: string) => d.trim()).filter((d: string) => d.length > 2)
    res.json(names)
  } catch {
    res.json([])
  }
})

router.post('/prescription/validate', async (req, res, next) => {
  const parsed = prescriptionValidateSchema.safeParse(req.body)
  if (!parsed.success) return next(new ApiError(400, 'BAD_REQUEST', 'Invalid prescription'))
  try {
    const out = await validatePrescription(parsed.data.meds, parsed.data.context as any)
    res.json(out)
  } catch (e) {
    next(e)
  }
})

router.get('/search', async (req, res, next) => {
  const parsed = searchQuerySchema.safeParse(req.query)
  if (!parsed.success) return next(new ApiError(400, 'BAD_REQUEST', 'Invalid query'))
  const q = parsed.data.q.trim()
  if (!q) return res.json([])
  const db = await getDb()

  try {
    const drugResults = await searchDrugs(q)
    const enrichedDrugs = await Promise.all(drugResults.map(async (d: any) => {
      const alts = await findAlternatives(d.active_ingredient, d.trade_name, d.avg_price)
      
      // هنا كان في مشكلة محتملة في الاستعلام، تم تأمينها
      let pharmacies: any[] = []
      try {
        pharmacies = await db.all(`
          SELECT p.id as pharmacy_id, p.name, p.address, s.price
          FROM pharmacy_stock s JOIN pharmacies p ON s.pharmacy_id = p.id
          WHERE ? LIKE '%' || s.drug_trade_name || '%'
             OR s.drug_trade_name LIKE '%' || ? || '%'
        `, [d.trade_name, d.trade_name])
      } catch (err) {
        // لو الجدول مش موجود منعملش كراش
      }

      return { ...d, type: 'medication', alternatives: alts, available_locations: pharmacies }
    }))

    // حماية جزء مستحضرات التجميل عشان لو الجدول مش موجود
    let formattedCosmetics: any[] = []
    try {
        const cosmeticResults = await db.all(`
        SELECT * FROM cosmetics
        WHERE name LIKE ? OR brand LIKE ? OR category LIKE ?
        `, [`%${q}%`, `%${q}%`, `%${q}%`])

        formattedCosmetics = cosmeticResults.map((c: any) => ({
        drug_id: `cosmetic_${c.id}`,
        trade_name: c.name,
        active_ingredient: c.brand,
        therapeutic_group: c.category,
        avg_price: c.price,
        form: `${c.skin_type} Skin`,
        type: 'cosmetic',
        description: c.description,
        alternatives: [],
        available_locations: []
        }))
    } catch (err) {
        // تجاهل الخطأ لو جدول cosmetics مش موجود
    }

    res.json([...enrichedDrugs, ...formattedCosmetics])
  } catch (e) {
    next(e)
  }
})

router.post('/allergy/check', async (req, res, next) => {
  const schema = allergyProfileSchema.extend({ active_ingredient: z.string().min(1).max(160) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) return next(new ApiError(400, 'BAD_REQUEST', 'Invalid allergy payload'))
  const result = checkAllergy(parsed.data.active_ingredient, { allergens: parsed.data.allergens })
  res.json(result)
})

router.post('/interactions/check', async (req, res, next) => {
  const parsed = interactionRequestSchema.safeParse(req.body)
  if (!parsed.success) return next(new ApiError(400, 'BAD_REQUEST', 'Invalid items'))
  try {
    const hits = await checkInteractions(parsed.data.items)
    res.json({ hits })
  } catch (e) {
    next(e)
  }
})

router.get('/inventory/forecast', async (req, res, next) => {
  const parsed = forecastQuerySchema.safeParse(req.query)
  if (!parsed.success) return next(new ApiError(400, 'BAD_REQUEST', 'Invalid query'))
  try {
    const points = await forecastDemand(parsed.data.trade_name, parsed.data.days)
    res.json({ trade_name: parsed.data.trade_name, days: parsed.data.days, points })
  } catch (e) {
    next(e)
  }
})


router.get('/pharmacies', async (_req, res, next) => {
  try {
    const db = await getDb()
    const rows = await db.all(`SELECT id, name, address, phone, gps_lat, gps_lng, logo_url FROM pharmacies ORDER BY id ASC LIMIT 50`)
    res.json({ pharmacies: rows })
  } catch (e) {
    next(e)
  }
})

router.post('/orders/reserve', async (req, res, next) => {
  const parsed = reserveOrderSchema.safeParse(req.body)
  if (!parsed.success) return next(new ApiError(400, 'BAD_REQUEST', 'Invalid order'))
  try {
    const db = await getDb()
    const now = new Date().toISOString()
    const code = `SP-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    const ctx = parsed.data.context || {}
    const row = await db.run(
      `INSERT INTO orders(order_code, pharmacy_id, created_at, status, patient_age, patient_sex, patient_weight, patient_allergies, patient_conditions, patient_current_meds)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        code,
        parsed.data.pharmacy_id,
        now,
        'reserved',
        ctx.age ?? null,
        ctx.sex ?? null,
        ctx.weightKg ?? null,
        JSON.stringify(ctx.allergies || []),
        JSON.stringify(ctx.conditions || []),
        JSON.stringify(ctx.currentMeds || [])
      ]
    )

    const orderId = row.lastID as number
    const itemsOut: any[] = []

    for (const it of parsed.data.items) {
      const qty = it.qty ?? 1
      const stock = await db.get(
        `SELECT s.price as price, s.stock_quantity as qty
         FROM pharmacy_stock s
         WHERE s.pharmacy_id = ? AND ( ? LIKE '%' || s.drug_trade_name || '%' OR s.drug_trade_name LIKE '%' || ? || '%' )
         ORDER BY s.stock_quantity DESC LIMIT 1`,
        [parsed.data.pharmacy_id, it.trade_name, it.trade_name]
      )

      const available = stock && Number(stock.qty || 0) > 0 ? 1 : 0
      const unitPrice = stock ? Number(stock.price || 0) : null

      await db.run(
        `INSERT INTO order_items(order_id, trade_name, qty, unit_price, available) VALUES (?,?,?,?,?)`,
        [orderId, it.trade_name, qty, unitPrice, available]
      )

      itemsOut.push({ trade_name: it.trade_name, qty, unit_price: unitPrice, available: !!available })
    }

    const total = itemsOut.reduce((sum, x) => sum + (x.available && x.unit_price ? x.unit_price * x.qty : 0), 0)
    res.json({ ok: true, order_code: code, pharmacy_id: parsed.data.pharmacy_id, items: itemsOut, total })
  } catch (e) {
    next(e)
  }
})

export default router
