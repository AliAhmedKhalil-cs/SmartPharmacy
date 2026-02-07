import { useMemo, useState } from 'react'
import type { CartItem, PatientContext } from '../types'
import type { InteractionHit, ReserveResponse } from '../lib/api'

type Props = {
  items: CartItem[]
  open: boolean
  patient: PatientContext
  onClose: () => void
  onRemove: (drug_id: string) => void
  onCheck: () => Promise<InteractionHit[]>
  onReserve: (pharmacy_id: number) => Promise<ReserveResponse>
}

function severityLabel(s: InteractionHit['severity']): string {
  if (s === 'high') return 'عالي'
  if (s === 'medium') return 'متوسط'
  return 'منخفض'
}

export function CartDrawer({ items, open, patient, onClose, onRemove, onCheck, onReserve }: Props) {
  const [loading, setLoading] = useState(false)
  const [hits, setHits] = useState<InteractionHit[] | null>(null)
  const [ordering, setOrdering] = useState(false)
  const [order, setOrder] = useState<ReserveResponse | null>(null)
  const [orderErr, setOrderErr] = useState('')
  const canCheck = items.length >= 2

  const headline = useMemo(() => {
    if (items.length === 0) return 'قائمة التحليل'
    if (items.length === 1) return 'قائمة التحليل (دواء واحد)'
    return `قائمة التحليل (${items.length})`
  }, [items.length])

  async function runCheck() {
    setLoading(true)
    try {
      const out = await onCheck()
      setHits(out)
    } finally {
      setLoading(false)
    }
  }


  const pharmacies = useMemo(() => {
    const map = new Map<number, { pharmacy_id: number, name: string, address: string, total: number, available: number, missing: string[] }>()
    for (const it of items) {
      const locs = it.available_locations || []
      const seen = new Set<number>()
      for (const loc of locs) {
        if (seen.has(loc.pharmacy_id)) continue
        seen.add(loc.pharmacy_id)
        const cur = map.get(loc.pharmacy_id) || { pharmacy_id: loc.pharmacy_id, name: loc.name, address: loc.address, total: 0, available: 0, missing: [] }
        cur.total += (Number(loc.price || 0) || 0) * (it.qty || 1)
        cur.available += 1
        map.set(loc.pharmacy_id, cur)
      }
    }
    const out = Array.from(map.values()).map(p => {
      const missing = items.filter(it => !(it.available_locations || []).some(l => l.pharmacy_id === p.pharmacy_id)).map(it => it.trade_name)
      return { ...p, missing }
    })
    out.sort((a, b) => {
      if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length
      return a.total - b.total
    })
    return out.slice(0, 5)
  }, [items])

  async function reserve(pharmacy_id: number) {
    setOrderErr('')
    setOrdering(true)
    try {
      const out = await onReserve(pharmacy_id)
      setOrder(out)
    } catch (e: any) {
      setOrderErr('مش قادر أحجز دلوقتي… جرّب تاني.')
      setOrder(null)
    } finally {
      setOrdering(false)
    }
  }
  if (!open) return null

  return (
    <div className="sp-drawer" role="dialog" aria-modal="true">
      <div className="sp-drawer-card">
        <div className="sp-drawer-head">
          <div className="sp-drawer-title">{headline}</div>
          <button className="sp-btn ghost" onClick={onClose} type="button">إغلاق</button>
        </div>

        <div className="sp-drawer-body">
          {items.length === 0 && <div className="sp-empty-small">ضيف أدوية من نتائج البحث عشان نحلل التفاعلات.</div>}

          {items.length > 0 && (
            <div className="sp-cart-list">
              {items.map((it) => (
                <div key={it.drug_id} className="sp-cart-item">
                  <div className="sp-cart-main">
                    <div className="sp-cart-name">{it.trade_name}</div>
                    <div className="sp-cart-sub">{it.active_ingredient}</div>
                  </div>
                  <button className="sp-btn danger" onClick={() => onRemove(it.drug_id)} type="button">حذف</button>
                </div>
              ))}
            </div>
          )}

          <div className="sp-cart-actions">
            <button className="sp-btn" onClick={runCheck} disabled={!canCheck || loading} type="button">
              {loading ? 'جاري التحليل…' : 'تحليل التفاعلات'}
            </button>
          
          <div className="sp-section">
            <div className="sp-section-title">حجز من صيدلية</div>
            {items.length === 0 && <div className="sp-empty-small">ضيف أدوية الأول عشان نعرض أقرب/أفضل صيدلية.</div>}

            {items.length > 0 && pharmacies.length === 0 && (
              <div className="sp-empty-small">مفيش بيانات توافر كفاية دلوقتي. جرّب بحث تاني أو استخدم صيدلية شريكة لاحقًا.</div>
            )}

            {items.length > 0 && pharmacies.length > 0 && (
              <div className="sp-cart-pharmacies">
                {pharmacies.map(p => (
                  <div key={p.pharmacy_id} className="sp-pharmacy-card">
                    <div className="sp-pharmacy-top">
                      <div>
                        <div className="sp-pharmacy-name">{p.name}</div>
                        <div className="sp-pharmacy-sub">{p.address || 'بدون عنوان'}</div>
                      </div>
                      <div className="sp-pharmacy-total">{Math.round(p.total)} ج.م</div>
                    </div>
                    {p.missing.length > 0 && (
                      <div className="sp-pharmacy-missing">ناقص: {p.missing.slice(0, 3).join('، ')}{p.missing.length > 3 ? '…' : ''}</div>
                    )}
                    <div className="sp-cart-actions" style={{ marginTop: 10 }}>
                      <button className="sp-btn success" onClick={() => reserve(p.pharmacy_id)} disabled={ordering} type="button">
                        {ordering ? 'جاري الحجز…' : 'احجز من هنا'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {orderErr ? <div className="sp-empty-small">{orderErr}</div> : null}

            {order?.ok && (
              <div className="sp-order-success">
                <div className="sp-order-code">✅ تم الحجز: {order.order_code}</div>
                <div className="sp-muted" style={{ marginTop: 6 }}>هنجهّز الطلب… وتقدر تكلم الصيدلية للتأكيد.</div>
              </div>
            )}
          </div>
</div>

          {hits && (
            <div className="sp-section">
              <div className="sp-section-title">نتيجة التفاعل</div>
              {hits.length === 0 && <div className="sp-empty-small">مفيش تفاعلات معروفة بين العناصر المختارة.</div>}
              {hits.map((h, idx) => (
                <div key={idx} className={`sp-interaction ${h.severity}`}>
                  <div className="sp-interaction-top">
                    <span className="sp-interaction-pill">{severityLabel(h.severity)}</span>
                    <span className="sp-interaction-pair">{h.a.trade_name} × {h.b.trade_name}</span>
                  </div>
                  <div className="sp-interaction-body">{h.summary}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
