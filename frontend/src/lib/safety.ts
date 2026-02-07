import type { PatientContext, SearchResultBase } from '../types'

export type Suitability = { level: 'ok' | 'warn' | 'danger', label: string, note?: string }

function norm(s: string) { return String(s || '').toLowerCase().trim() }

function includesAny(hay: string, needles: string[]) {
  const h = norm(hay)
  return needles.some(n => h.includes(norm(n)))
}

function hasAny(list: string[] | undefined, needles: string[]) {
  const hay = (list || []).map(norm)
  return needles.some(n => hay.some(h => h.includes(norm(n))))
}

export function computeSuitability(item: SearchResultBase, patient: PatientContext): Suitability {
  const active = norm(item.active_ingredient || '')
  const name = norm(item.trade_name || '')

  const allergies = patient.allergies || []
  if (active && hasAny(allergies, [active])) return { level: 'danger', label: 'غير مناسب', note: 'يتعارض مع الحساسية' }
  if (allergies.length && includesAny(name, allergies)) return { level: 'danger', label: 'غير مناسب', note: 'تحذير حساسية' }

  const conditions = patient.conditions || []
  const hasKidney = hasAny(conditions, ['كلى', 'kidney'])
  const hasUlcer = hasAny(conditions, ['قرحة', 'ulcer'])
  const hasHTN = hasAny(conditions, ['ضغط', 'hypertension'])
  const hasHeart = hasAny(conditions, ['قلب', 'heart'])

  const isNsaid = includesAny(active, ['ibuprofen', 'diclofenac', 'naproxen', 'ketoprofen', 'meloxicam', 'celecoxib']) || includesAny(name, ['brufen', 'voltaren', 'cataflam'])
  if (isNsaid && (hasKidney || hasUlcer || hasHTN || hasHeart)) return { level: 'warn', label: 'تحذير', note: 'راجع صيدلي/طبيب مع حالتك' }

  const isDecong = includesAny(name, ['congestal', 'sudafed', 'panadol cold', 'cold & flu']) || includesAny(active, ['pseudoephedrine', 'phenylephrine'])
  if (isDecong && (hasHTN || hasHeart)) return { level: 'warn', label: 'تحذير', note: 'قد يرفع الضغط/الخفقان' }

  const current = patient.currentMeds || []
  if (active && hasAny(current, [active])) return { level: 'warn', label: 'تحذير', note: 'قد يكون تكرار للمادة الفعالة' }

  return { level: 'ok', label: 'مناسب', note: '' }
}
