import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleCors, sendJson, readJsonBody, parsePatientContext } from './_util'

export const config = {
  runtime: 'nodejs'
}

function keyFromEnv() {
  return String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
}

function looksLikeKey(k: string) {
  return k && k.length >= 30 && /^[A-Za-z0-9_\-]+$/.test(k)
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
  if (m.includes('حساسي') || m.includes('allerg')) 
    return 'تمام. قولّي الحساسية من اي مادة فعالة تحديدًا (زي paracetamol/ibuprofen) + سنك وأي أمراض مزمنة، وأنا أرشح بدائل OTC آمنة مع تحذيرات.'
  if (m.includes('جرعة') || m.includes('dose')) 
    return 'الجرعة بتعتمد على العمر والوزن والحالة. قولّي اسم الدوا + العمر/الوزن وأي أمراض مزمنة.'
  if (m.includes('مضاد') || m.includes('antibi')) 
    return 'المضاد الحيوي لازم بوصفة. لو فيه حساسية/طفح/ضيق نفس لازم طوارئ.'
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
    contents: [{ role: 'user', parts: [{ text: system + '\n\nسؤال المستخدم: ' + message }] }],
    generationConfig: { temperature: 0.35, maxOutputTokens: 240 }
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return
  
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const body = await readJsonBody(req)
    const message = String(body?.message || '').trim()
    
    if (!message) {
      return sendJson(res, 400, { ok: false, code: 'BAD_REQUEST', message: 'Message required' })
    }

    const ctx = parsePatientContext(body?.context || {})

    try {
      const reply = await geminiReply(message, ctx)
      return sendJson(res, 200, { ok: true, reply, provider: 'gemini' })
    } catch (e: any) {
      const reply = fallbackReply(message)
      return sendJson(res, 200, { ok: true, reply, provider: 'fallback', warning: String(e?.message || e) })
    }
  } catch (e: any) {
    return sendJson(res, 500, { ok: false, code: 'INTERNAL_ERROR', message: String(e?.message || e) })
  }
}
