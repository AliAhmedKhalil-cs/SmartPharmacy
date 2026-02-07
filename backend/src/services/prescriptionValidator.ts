import { searchDrugs, findAlternatives } from './drugSearch.js'
import { checkInteractions } from './interactions.js'
import { checkAllergy } from './allergy.js'

export type PatientContext = {
  age?: number
  sex?: 'male' | 'female' | 'other'
  weightKg?: number
  allergies?: string[]
  conditions?: string[]
  currentMeds?: string[]
}

export type RxResolvedItem = {
  input: string
  match: null | {
    drug_id: number | string
    trade_name: string
    active_ingredient: string
    therapeutic_group?: string
    avg_price?: number
    form?: string
  }
}

export type RxFlagLevel = 'info' | 'warn' | 'danger'

export type RxFlag = {
  level: RxFlagLevel
  code: string
  title: string
  message: string
  related?: string[]
}

export type RxAlternative = {
  trade_name: string
  active_ingredient: string
  avg_price?: number
}

export type RxValidationResult = {
  items: RxResolvedItem[]
  flags: RxFlag[]
  interactions: any[]
  allergy: any
  alternatives: Record<string, RxAlternative[]>
}

function norm(s: string) {
  return String(s || '').toLowerCase().trim()
}

function hasAny(texts: string[] | undefined, needles: string[]) {
  const hay = (texts || []).map(norm)
  return needles.some(n => hay.some(h => h.includes(norm(n))))
}

function buildConditionFlags(items: RxResolvedItem[], ctx: PatientContext | undefined): RxFlag[] {
  const flags: RxFlag[] = []
  const conditions = ctx?.conditions || []
  const acts = items.map(x => norm(x.match?.active_ingredient || '')).filter(Boolean)
  const names = items.map(x => norm(x.match?.trade_name || x.input)).filter(Boolean)

  const hasNsaid = acts.some(a => ['ibuprofen','diclofenac','naproxen','ketoprofen','celecoxib','meloxicam'].some(k => a.includes(k)))
  const hasPseudo = names.some(n => n.includes('congestal') || n.includes('sudafed') || n.includes('pseudo'))

  if (hasNsaid && hasAny(conditions, ['ضغط', 'high blood', 'hypertension', 'kidney', 'كلى', 'قرحة', 'ulcer'])) {
    flags.push({
      level: 'warn',
      code: 'COND_NSAID',
      title: 'تنبيه مع المسكنات',
      message: 'لو عندك ضغط/مشاكل كلى/قرحة، بعض المسكنات (NSAIDs) ممكن تزود المخاطر. راجع صيدلي/طبيب قبل الاستخدام.',
      related: items.filter(x => ['ibuprofen','diclofenac','naproxen','ketoprofen','celecoxib','meloxicam'].some(k => norm(x.match?.active_ingredient||'').includes(k))).map(x => x.match?.trade_name || x.input)
    })
  }

  if (hasPseudo && hasAny(conditions, ['ضغط', 'high blood', 'hypertension', 'heart', 'قلب'])) {
    flags.push({
      level: 'warn',
      code: 'COND_DECONGEST',
      title: 'تنبيه مزيل احتقان',
      message: 'مزيلات الاحتقان ممكن ترفع الضغط وتسرّع ضربات القلب. لو عندك ضغط/قلب، الأفضل تستشير صيدلي/طبيب.',
      related: items.filter(x => norm(x.match?.trade_name||x.input).includes('congestal') || norm(x.match?.trade_name||x.input).includes('sudafed') || norm(x.match?.trade_name||x.input).includes('pseudo')).map(x => x.match?.trade_name || x.input)
    })
  }

  const age = ctx?.age
  if (age !== undefined && age < 12 && acts.some(a => a.includes('aspirin'))) {
    flags.push({
      level: 'danger',
      code: 'PED_ASPIRIN',
      title: 'تحذير للأطفال',
      message: 'الأسبرين للأطفال أقل من 12 سنة غير مُفضل إلا بوصفة، بسبب مخاطر نادرة. راجع طبيب/صيدلي.',
      related: items.filter(x => norm(x.match?.active_ingredient||'').includes('aspirin')).map(x => x.match?.trade_name || x.input)
    })
  }

  return flags
}

function buildDuplicateFlags(items: RxResolvedItem[]): RxFlag[] {
  const flags: RxFlag[] = []
  const byActive = new Map<string, RxResolvedItem[]>()
  for (const it of items) {
    const a = norm(it.match?.active_ingredient || '')
    if (!a) continue
    const list = byActive.get(a) || []
    list.push(it)
    byActive.set(a, list)
  }
  for (const [active, list] of byActive.entries()) {
    if (list.length < 2) continue
    flags.push({
      level: 'warn',
      code: 'DUP_ACTIVE',
      title: 'تكرار نفس المادة الفعالة',
      message: `فيه أكتر من دواء بنفس المادة الفعالة (${active}). ده ممكن يسبب جرعة زيادة بدون قصد.`,
      related: list.map(x => x.match?.trade_name || x.input)
    })
  }
  return flags
}

function buildGeneralFlags(items: RxResolvedItem[]): RxFlag[] {
  const unknown = items.filter(x => !x.match)
  if (!unknown.length) return []
  return [{
    level: 'info',
    code: 'UNKNOWN_ITEMS',
    title: 'عناصر غير مؤكدة',
    message: 'في أدوية مش قدرنا نحددها بدقة. جرّب تكتب الاسم بشكل أوضح أو اختار من الاقتراحات.',
    related: unknown.map(x => x.input)
  }]
}

async function resolveItems(inputs: string[]): Promise<RxResolvedItem[]> {
  const clean = inputs.map(x => String(x || '').trim()).filter(Boolean).slice(0, 12)
  const resolved: RxResolvedItem[] = []
  for (const input of clean) {
    const hits = await searchDrugs(input)
    const best = hits[0] || null
    resolved.push({ input, match: best ? {
      drug_id: best.drug_id,
      trade_name: best.trade_name,
      active_ingredient: best.active_ingredient,
      therapeutic_group: (best as any).therapeutic_group,
      avg_price: (best as any).avg_price,
      form: (best as any).form
    } : null })
  }
  return resolved
}

export async function validatePrescription(meds: string[], ctx?: PatientContext): Promise<RxValidationResult> {
  const items = await resolveItems(meds)
  const known = items.filter(x => x.match && x.match.active_ingredient).map(x => ({ trade_name: x.match!.trade_name, active_ingredient: x.match!.active_ingredient }))
  const interactions = known.length >= 2 ? await checkInteractions(known) : []
  const allergyHits: any[] = []
  if (ctx?.allergies?.length) {
    for (const it of known) {
      const r = checkAllergy(it.active_ingredient, { allergens: ctx.allergies })
      if (r.hit) allergyHits.push({ trade_name: it.trade_name, active_ingredient: it.active_ingredient, matched: r.matched })
    }
  }
  const flags: RxFlag[] = []
  flags.push(...buildGeneralFlags(items))
  flags.push(...buildDuplicateFlags(items))
  flags.push(...buildConditionFlags(items, ctx))

  if (allergyHits.length) {
    flags.push({
      level: 'danger',
      code: 'ALLERGY_HIT',
      title: 'تحذير حساسية',
      message: 'فيه أدوية ممكن تتعارض مع الحساسية المسجلة. راجع صيدلي/طبيب قبل الاستخدام.',
      related: allergyHits.map((h: any) => h.trade_name || h.active_ingredient).filter(Boolean)
    })
  }

  if (Array.isArray(interactions) && interactions.length) {
    const hi = interactions.some((x: any) => x.severity === 'high')
    flags.push({
      level: hi ? 'danger' : 'warn',
      code: 'INTERACTIONS',
      title: 'تداخلات دوائية محتملة',
      message: hi ? 'فيه تداخلات خطيرة محتملة بين بعض الأدوية.' : 'فيه تداخلات محتملة بين بعض الأدوية. راجع صيدلي/طبيب.',
      related: interactions.slice(0, 6).map((x: any) => `${x.a.trade_name} + ${x.b.trade_name}`)
    })
  }

  const alternatives: Record<string, RxAlternative[]> = {}
  for (const it of items) {
    if (!it.match?.active_ingredient) continue
    const alts = await findAlternatives(it.match.active_ingredient, it.match.trade_name, it.match.avg_price as any)
    alternatives[it.match.trade_name] = alts.map(a => ({ trade_name: a.trade_name, active_ingredient: a.active_ingredient, avg_price: (a as any).avg_price }))
  }

  return { items, flags, interactions, allergy: { hits: allergyHits }, alternatives }
}
