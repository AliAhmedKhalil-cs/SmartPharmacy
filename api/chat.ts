export const config = { runtime: 'nodejs' }

import { parsePatientContext, readJsonBody, sendError, sendOk } from './_util'

function keyFromEnv() {
  const k = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
  return k
}

function looksLikeKey(k: string) {
  if (!k) return false
  if (k.length < 30) return false
  return /^[A-Za-z0-9_\-]+$/.test(k)
}

function ctxText(ctx: any) {
  const parts: string[] = []
  if (ctx?.age !== undefined) parts.push(`العمر: ${ctx.age}`)
  if (ctx?.sex) parts.push(`النوع: ${ctx.sex}`)
  if (ctx?.weightKg !== undefined) parts.push(`الوزن: ${ctx.weightKg}kg`)
  if (ctx?.allergies?.length) parts.push(`حساسية: ${ctx.allergies.join('، ')}`)
  if (ctx?.conditions?.length) parts.push(`حالات مزمنة: ${ctx.conditions.join('، ')}`)
  if (ctx?.currentMeds?.length) parts.push(`أدوية حالية: ${ctx.currentMeds.join('، ')}`)
  return parts.length ? parts.join(' | ') : 'لا يوجد'
}

function fallbackReply(message: string) {
  const m = message.toLowerCase()
  if (m.includes('جرعة') || m.includes('dose')) return 'الجرعة بتعتمد على العمر والوزن والحالة. لو تقولي اسم الدوا + العمر/الوزن أقدر أديك نطاق جرعات شائع وامتى لازم ترجع لدكتور.'
  if (m.includes('صداع') || m.includes('headache')) return 'للصداع الخفيف: باراسيتامول غالباً خيار آمن لمعظم الناس. لو عندك حساسية/قرحة/حمل أو الصداع شديد أو متكرر، الأفضل استشارة طبيب.'
  if (m.includes('مضاد') || m.includes('antibi')) return 'المضاد الحيوي لازم يكون بوصفة، ومتوقفش قبل المدة إلا لو الدكتور قال. لو في حساسية/طفح/ضيق تنفس لازم طوارئ.'
  return 'تمام. احكيلي الأعراض أو اسم الدوا اللي بتسأل عنه، ولو عندك حساسية أو أمراض مزمنة قولّي عشان الرد يبقى أدق.'
}

async function geminiReply(message: string, ctx: any) {
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
    contents: [
      { role: 'user', parts: [{ text: system + '\n\nسؤال المستخدم: ' + message }] }
    ],
    generationConfig: { temperature: 0.4, maxOutputTokens: 220 }
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const data: any = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data?.error?.message || `Gemini error (${r.status})`)

  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('') || ''
  if (!text) throw new Error('Empty model response')
  return text.trim()
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')

  try {
    const body = await readJsonBody(req)
    const message = String(body?.message || '').trim()
    if (!message) return sendError(res, 400, 'BAD_REQUEST', 'Message required')
    const ctx = parsePatientContext(body?.context || {})

    try {
      const reply = await geminiReply(message, ctx)
      return sendOk(res, { reply, provider: 'gemini' })
    } catch (e: any) {
      const reply = fallbackReply(message)
      return sendOk(res, { reply, provider: 'fallback', warning: String(e?.message || e) })
    }
  } catch (e: any) {
    return sendError(res, 500, 'INTERNAL_ERROR', String(e?.message || e))
  }
}
