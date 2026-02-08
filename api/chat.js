function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', c => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

async function readJson(req) {
  const raw = await readBody(req)
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

function keyFromEnv() {
  return String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
}

function looksLikeKey(k) {
  if (!k) return false
  if (k.length < 30) return false
  return /^[A-Za-z0-9_\-]+$/.test(k)
}

function normalizeList(v) {
  if (!v) return []
  if (Array.isArray(v)) return v.map(x => String(x).trim()).filter(Boolean).slice(0, 50)
  return String(v).split(',').map(s => s.trim()).filter(Boolean).slice(0, 50)
}

function parseCtx(ctx) {
  const age = ctx && ctx.age !== undefined ? Number(ctx.age) : undefined
  const weightKg = ctx && ctx.weightKg !== undefined ? Number(ctx.weightKg) : undefined
  const sex = ctx && ctx.sex ? String(ctx.sex) : undefined
  const allergies = normalizeList(ctx && ctx.allergies)
  const conditions = normalizeList(ctx && ctx.conditions)
  const currentMeds = normalizeList(ctx && ctx.currentMeds)
  return {
    age: Number.isFinite(age) ? age : undefined,
    weightKg: Number.isFinite(weightKg) ? weightKg : undefined,
    sex,
    allergies,
    conditions,
    currentMeds
  }
}

function ctxText(ctx) {
  const parts = []
  if (ctx && ctx.age !== undefined) parts.push(`العمر: ${ctx.age}`)
  if (ctx && ctx.sex) parts.push(`النوع: ${ctx.sex}`)
  if (ctx && ctx.weightKg !== undefined) parts.push(`الوزن: ${ctx.weightKg}kg`)
  if (ctx && ctx.allergies && ctx.allergies.length) parts.push(`حساسية: ${ctx.allergies.join('، ')}`)
  if (ctx && ctx.conditions && ctx.conditions.length) parts.push(`حالات مزمنة: ${ctx.conditions.join('، ')}`)
  if (ctx && ctx.currentMeds && ctx.currentMeds.length) parts.push(`أدوية حالية: ${ctx.currentMeds.join('، ')}`)
  return parts.length ? parts.join(' | ') : 'لا يوجد'
}

function fallbackReply(message) {
  const m = String(message || '').toLowerCase()
  if (m.includes('حساسي') || m.includes('allerg')) return 'تمام. قولّي الحساسية من اي مادة فعالة تحديدًا + سنك وأي أمراض مزمنة، وأنا أرشح بدائل OTC آمنة مع تحذيرات.'
  if (m.includes('جرعة') || m.includes('dose')) return 'الجرعة بتعتمد على العمر والوزن والحالة. قولّي اسم الدوا + العمر/الوزن وأي أمراض مزمنة.'
  if (m.includes('مضاد') || m.includes('antibi')) return 'المضاد الحيوي لازم بوصفة. لو فيه حساسية/طفح/ضيق نفس لازم طوارئ.'
  return 'تمام. احكيلي الأعراض أو اسم الدوا اللي بتسأل عنه، ولو عندك حساسية أو أمراض مزمنة قولّي عشان الرد يبقى أدق.'
}

async function geminiReply(message, ctx) {
  const apiKey = keyFromEnv()
  if (!looksLikeKey(apiKey)) throw new Error('Invalid GEMINI_API_KEY')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
  const system = [
    'أنت مساعد صيدلي عربي مصري. اجاباتك قصيرة، عملية، وآمنة.',
    'ممنوع التشخيص القاطع أو وصف أدوية روشتة بدون تنبيه لزيارة طبيب.',
    'لو الحالة خطرة (ضيق تنفس/نزيف/إغماء/ألم صدر/حساسية شديدة) قول طوارئ فوراً.',
    `سياق المريض: ${ctxText(ctx)}`
  ].join('\n')

  const payload = {
    contents: [{ role: 'user', parts: [{ text: system + '\n\nسؤال المستخدم: ' + message }] }],
    generationConfig: { temperature: 0.35, maxOutputTokens: 240 }
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((data && data.error && data.error.message) || `Gemini error (${r.status})`)

  const parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts
  const text = Array.isArray(parts) ? parts.map(p => p && p.text).filter(Boolean).join('') : ''
  if (!text) throw new Error('Empty model response')
  return String(text).trim()
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' })

  try {
    const body = await readJson(req)
    const message = String(body && body.message || '').trim()
    if (!message) return sendJson(res, 400, { ok: false, code: 'BAD_REQUEST', message: 'Message required' })

    const ctx = parseCtx((body && body.context) || {})

    try {
      const reply = await geminiReply(message, ctx)
      return sendJson(res, 200, { ok: true, reply, provider: 'gemini' })
    } catch (e) {
      const reply = fallbackReply(message)
      return sendJson(res, 200, { ok: true, reply, provider: 'fallback', warning: String((e && e.message) || e) })
    }
  } catch (e) {
    return sendJson(res, 500, { ok: false, code: 'INTERNAL_ERROR', message: String((e && e.message) || e) })
  }
}
