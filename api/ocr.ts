import type { VercelRequest, VercelResponse } from '@vercel/node'
import { handleCors, sendJson, readJsonBody } from './_util'

export const config = {
  runtime: 'nodejs'
}

function keyFromEnv() {
  return String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
}

function looksLikeKey(k: string) {
  return k && k.length >= 30 && /^[A-Za-z0-9_\-]+$/.test(k)
}

async function geminiOcr(imageBase64: string, mimeType: string) {
  const apiKey = keyFromEnv()
  if (!looksLikeKey(apiKey)) throw new Error('Invalid GEMINI_API_KEY')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`
  const prompt = [
    'اقرأ الروشتة من الصورة واستخرج أسماء الأدوية فقط.',
    'رجّع النتيجة JSON Array من strings بدون أي كلام إضافي.',
    'لو مش واضح، رجّع Array فاضي.'
  ].join('\n')

  const payload = {
    contents: [{
      role: 'user',
      parts: [
        { text: prompt },
        { inline_data: { mime_type: mimeType, data: imageBase64 } }
      ]
    }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 220 }
  }

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })

  const data: any = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(data?.error?.message || `Gemini error (${r.status})`)

  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('') || '[]'
  const parsed = JSON.parse(text)
  return Array.isArray(parsed) ? parsed.map(x => String(x).trim()).filter(Boolean).slice(0, 30) : []
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return
  
  if (req.method !== 'POST') {
    return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' })
  }

  try {
    const body = await readJsonBody(req)
    const imageBase64 = String(body?.image_base64 || '').trim()
    const mimeType = String(body?.mime || '').trim() || 'image/jpeg'
    
    if (!imageBase64) {
      return sendJson(res, 400, { ok: false, code: 'BAD_REQUEST', message: 'image_base64 required' })
    }

    try {
      const meds = await geminiOcr(imageBase64, mimeType)
      return sendJson(res, 200, meds)
    } catch {
      return sendJson(res, 200, [])
    }
  } catch (e: any) {
    return sendJson(res, 500, { ok: false, code: 'INTERNAL_ERROR', message: String(e?.message || e) })
  }
}
