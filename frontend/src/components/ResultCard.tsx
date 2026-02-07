import type { PatientContext, SearchResultBase } from '../types'
import { computeSuitability } from '../lib/safety'

type Props = {
  item: SearchResultBase
  allergens: string[]
  inCart: boolean
  onToggleCart: (item: SearchResultBase) => void
  patient?: PatientContext
}

function norm(s: string): string { return s.toLowerCase().trim() }

function allergyMatch(active: string | undefined, allergens: string[]): string[] {
  const a = norm(active || '')
  if (!a) return []
  const list = allergens.map(norm).filter(Boolean)
  return list.filter(x => a.includes(x) || x.includes(a))
}

function medOverlap(active: string | undefined, currentMeds: string[] | undefined): boolean {
  const a = norm(active || '')
  if (!a) return false
  const meds = (currentMeds || []).map(norm).filter(Boolean)
  return meds.some(m => m.includes(a) || a.includes(m))
}

function hasConditionHint(conditions: string[] | undefined): boolean {
  const c = (conditions || []).map(norm)
  return c.some(x => ['ضغط', 'سكر', 'سكري', 'ربو', 'حساسية', 'قلب', 'حامل', 'حمل'].some(k => x.includes(k)))
}

export function ResultCard({ item, allergens, inCart, onToggleCart, patient }: Props) {
  const matches = allergyMatch(item.active_ingredient, allergens)
  const warnAllergy = matches.length > 0
  const warnDup = medOverlap(item.active_ingredient, patient?.currentMeds)
  const warnCond = hasConditionHint(patient?.conditions)
  const suit = computeSuitability(item, patient || { allergies: [], conditions: [], currentMeds: [] })

  return (
    <article className="sp-card">
      <div className="sp-card-head">
        <div>
          <div className="sp-card-title">
            <span>{item.trade_name}</span>
            <span className="sp-badges">
              {item.type === 'cosmetic' ? <span className="sp-badge cosmetic">💄 تجميل</span> : <span className="sp-badge">💊 دواء</span>}
              <span className={`sp-badge suit ${suit.level}`}>{suit.label}</span>
              {warnAllergy && <span className="sp-badge danger">⚠️ حساسية</span>}
              {warnDup && <span className="sp-badge warn">🔁 تكرار</span>}
              {warnCond && <span className="sp-badge info">🧾 راجع حالتك</span>}
            </span>
          </div>

          <div className="sp-card-meta">
            {item.active_ingredient ? <span>المادة الفعالة: {item.active_ingredient}</span> : <span className="sp-muted">بدون مادة فعالة</span>}
            {item.form ? <span className="sp-dot">•</span> : null}
            {item.form ? <span>{item.form}</span> : null}
          </div>
          {suit.note ? <div className={`sp-suit-note ${suit.level}`}>{suit.note}</div> : null}
        </div>

        <button className={`sp-btn ${inCart ? 'danger' : 'secondary'}`} onClick={() => onToggleCart(item)} type="button">
          {inCart ? 'إزالة' : 'إضافة للتحليل'}
        </button>
      </div>

      {warnAllergy && (
        <div className="sp-alert danger">
          <div className="sp-alert-title">تحذير حساسية</div>
          <div className="sp-alert-body">المادة الفعالة بتتقاطع مع: {matches.join(', ')}</div>
        </div>
      )}

      {warnDup && (
        <div className="sp-alert warn">
          <div className="sp-alert-title">تنبيه</div>
          <div className="sp-alert-body">المادة الفعالة دي قريبة/موجودة ضمن أدوية بتستخدمها. راجع الصيدلي قبل الجمع.</div>
        </div>
      )}

      <div className="sp-price">
        <span className="sp-price-label">السعر</span>
        <span className="sp-price-value">{Number(item.avg_price || 0).toFixed(0)} ج.م</span>
      </div>

      {item.description && <div className="sp-desc">{item.description}</div>}

      {item.available_locations && item.available_locations.length > 0 && (
        <div className="sp-section">
          <div className="sp-section-title">متوفر في صيدليات</div>
          <div className="sp-locations">
            {item.available_locations.slice(0, 3).map((p) => (
              <div key={`${p.name}-${p.address}`} className="sp-location">
                <div className="sp-location-name">{p.name}</div>
                <div className="sp-location-addr">{p.address}</div>
                <div className="sp-location-price">{Number(p.price || 0).toFixed(0)} ج.م</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {item.alternatives && item.alternatives.length > 0 && (
        <div className="sp-section">
          <div className="sp-section-title">بدائل</div>
          <div className="sp-alts">
            {item.alternatives.slice(0, 4).map((a) => (
              <div key={a.trade_name} className="sp-alt">
                <span className="sp-alt-name">{a.trade_name}</span>
                <span className="sp-alt-price">{Number(a.avg_price || 0).toFixed(0)} ج.م</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}
