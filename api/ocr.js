export const runtime = 'nodejs'

function sendJson(res: any, status: number, payload: any) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(payload))
}

function readBody(req: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c: any) => (data += c))
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

async function readJson(req: any) {
  const raw = await readBody(req)
  if (!raw) return {}
  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function keyFromEnv() {
  return String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim()
}

function looksLikeKey(k: string) {
  if (!k) return false
  if (k.length < 30) return false
  return /^[A-Za-z0-9_\-]+$/.test(k)
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
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } }
        ]
      }
    ],
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED' })

  try {
    const body = await readJson(req)
    const imageBase64 = String(body?.image_base64 || '').trim()
    const mimeType = String(body?.mime || '').trim() || 'image/jpeg'
    if (!imageBase64) return sendJson(res, 400, { ok: false, code: 'BAD_REQUEST', message: 'image_base64 required' })

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
