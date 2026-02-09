module.exports = async function (req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')

  if (req.method !== 'POST') {
    res.statusCode = 405
    return res.end(JSON.stringify({ ok: false, message: 'Method not allowed' }))
  }

  let body = ''
  for await (const chunk of req) body += chunk

  let data = {}
  try {
    data = JSON.parse(body || '{}')
  } catch {}

  const message = String(data.message || '').trim()
  const ctx = data.context || {}

  if (!message) {
    res.statusCode = 400
    return res.end(JSON.stringify({ ok: false, message: 'Message required' }))
  }

  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''

  if (!apiKey || apiKey.length < 30) {
    return res.end(JSON.stringify({
      ok: true,
      reply: fallback(message),
      provider: 'fallback'
    }))
  }

  try {
    const reply = await gemini(message, ctx, apiKey)
    return res.end(JSON.stringify({ ok: true, reply, provider: 'gemini' }))
  } catch (e) {
    return res.end(JSON.stringify({
      ok: true,
      reply: fallback(message),
      provider: 'fallback'
    }))
  }
}

function fallback(msg) {
  if (msg.includes('حساسي'))
    return 'تمام، قولّي الحساسية من مادة فعالة إيه وأنا أقولك البدائل الآمنة.'
  return 'احكيلي الأعراض أو اسم الدوا بالتحديد.'
}

async function gemini(message, ctx, key) {
  const url =
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' +
    encodeURIComponent(key)

  const prompt =
    'أنت مساعد صيدلي عربي مصري.\n' +
    'تجاوب بإجابات قصيرة وآمنة.\n' +
    'سياق المريض: ' + JSON.stringify(ctx) +
    '\n\nسؤال المستخدم: ' + message

  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 220 }
    })
  })

  const j = await r.json()
  return j.candidates[0].content.parts[0].text.trim()
}
