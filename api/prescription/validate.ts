import { loadDrugs, norm, parsePatientContext, readJsonBody, sendError, sendOk } from '../_util'

const interactionRules = [
  { a: 'warfarin', b: 'ibuprofen', severity: 'high', summary: 'يزود خطر النزيف' },
  { a: 'warfarin', b: 'aspirin', severity: 'high', summary: 'يزود خطر النزيف' },
  { a: 'metformin', b: 'alcohol', severity: 'medium', summary: 'يزود خطر الحماض اللبني' },
  { a: 'isotretinoin', b: 'vitamin a', severity: 'medium', summary: 'يزود السمية' }
]

function score(sev: string) {
  if (sev === 'high') return 3
  if (sev === 'medium') return 2
  return 1
}

function findDrug(drugs: any[], name: string) {
  const n = norm(name)
  const byTrade = drugs.find(d => norm(d.trade_name) === n) || drugs.find(d => norm(d.trade_name).includes(n))
  if (byTrade) return byTrade
  return drugs.find(d => norm(d.active_ingredient).includes(n))
}

function alternatives(drugs: any[], active: string, trade: string, avgPrice?: number) {
  const activeN = norm(active)
  const base = Number.isFinite(avgPrice as any) ? Number(avgPrice) : undefined
  const candidates = drugs.filter(d => norm(d.active_ingredient) === activeN && norm(d.trade_name) !== norm(trade))
  const scored = candidates.map(d => {
    const p = Number.isFinite(d.avg_price as any) ? Number(d.avg_price) : undefined
    const delta = base !== undefined && p !== undefined ? Math.abs(p - base) : 9999
    return { d, delta }
  }).sort((a, b) => a.delta - b.delta)
  return scored.slice(0, 6).map(x => x.d)
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed')
  const body = await readJsonBody(req)
  const medsRaw = Array.isArray(body?.meds) ? body.meds : []
  const meds = medsRaw.map((x: any) => String(x || '').trim()).filter(Boolean).slice(0, 12)
  if (!meds.length) return sendError(res, 400, 'BAD_REQUEST', 'Invalid prescription')
  const ctx = parsePatientContext(body?.context || {})
  const drugs = await loadDrugs()

  const items = meds.map(name => {
    const drug = findDrug(drugs, name)
    const active = drug?.active_ingredient ? String(drug.active_ingredient) : ''
    const reasons: string[] = []
    let status: 'ok' | 'warning' | 'not_ok' = 'ok'

    if (!drug) {
      status = 'warning'
      reasons.push('مش لاقيين الدوا ده في قاعدة البيانات عندنا')
      return { input: name, status, reasons, drug: null }
    }

    const allergies = (ctx.allergies || []).map(norm)
    const activeN = norm(active)
    const hit = allergies.find(a => a && activeN.includes(a))
    if (hit) {
      status = 'not_ok'
      reasons.push(`ممكن يسبب حساسية بسبب (${hit})`)
    }

    if (ctx.age !== undefined && ctx.age < 12) {
      if (activeN.includes('ibuprofen') || activeN.includes('aspirin')) {
        status = status === 'not_ok' ? 'not_ok' : 'warning'
        reasons.push('سن صغير: الأفضل مراجعة طبيب/صيدلي للجرعة والنوع')
      }
    }

    if (ctx.conditions?.some(c => norm(c).includes('kidney') || norm(c).includes('كلى') || norm(c).includes('كلية'))) {
      if (activeN.includes('ibuprofen') || activeN.includes('diclofenac')) {
        status = 'not_ok'
        reasons.push('مشكلة كلى + مسكنات NSAIDs ممكن تضر')
      }
    }

    return {
      input: name,
      status,
      reasons,
      drug: {
        ...drug,
        type: 'medication',
        alternatives: alternatives(drugs, drug.active_ingredient, drug.trade_name, drug.avg_price)
      }
    }
  })

  const matchedForInteractions = items.filter(x => x.drug).map(x => ({
    trade_name: x.drug.trade_name,
    active_ingredient: x.drug.active_ingredient
  }))

  const interactions: any[] = []
  for (let i = 0; i < matchedForInteractions.length; i++) {
    for (let j = i + 1; j < matchedForInteractions.length; j++) {
      const a = matchedForInteractions[i]
      const b = matchedForInteractions[j]
      const aN = norm(a.active_ingredient)
      const bN = norm(b.active_ingredient)
      const rule = interactionRules.find(r => (r.a === aN && r.b === bN) || (r.a === bN && r.b === aN))
      if (rule) interactions.push({ a, b, severity: rule.severity, summary: rule.summary })
    }
  }
  interactions.sort((x, y) => score(y.severity) - score(x.severity))

  const flags: any[] = []
  if (ctx.allergies?.length) flags.push({ type: 'context', severity: 'info', text: `مسجل عندك حساسية: ${ctx.allergies.join('، ')}` })
  if (ctx.conditions?.length) flags.push({ type: 'context', severity: 'info', text: `مسجل حالات مزمنة: ${ctx.conditions.join('، ')}` })
  if (interactions.length) flags.push({ type: 'interaction', severity: interactions[0].severity, text: 'في تداخلات محتملة بين الأدوية' })

  return sendOk(res, { items, flags, interactions })
}
