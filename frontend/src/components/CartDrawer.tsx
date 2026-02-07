import { useEffect, useMemo, useState } from 'react'
import type { CartItem, PatientContext } from '../types'
import type { InteractionHit, ReserveResponse } from '../lib/api'

type Tab = 'cart' | 'interactions' | 'reserve'

type Props = {
  items: CartItem[]
  open: boolean
  patient: PatientContext
  onClose: () => void
  onCheckout: () => void
  onRemove: (drug_id: string) => void
  onClear: () => void
  onSetQty: (drug_id: string, qty: number) => void
  onCheck: () => Promise<InteractionHit[]>
  onReserve: (pharmacy_id: number) => Promise<ReserveResponse>
}

type PharmacyPick = {
  pharmacy_id: number
  name: string
  address: string
  total: number
  missing: string[]
  status: 'good' | 'warn' | 'bad'
}

function money(n: number) {
  const v = Math.round(Number.isFinite(n) ? n : 0)
  return `${v} ج.م`
}

function severityLabel(s: InteractionHit['severity']): string {
  if (s === 'high') return 'عالي'
  if (s === 'medium') return 'متوسط'
  return 'منخفض'
}

function pickStatus(missingCount: number, totalCount: number): PharmacyPick['status'] {
  if (totalCount <= 0) return 'warn'
  if (missingCount === 0) return 'good'
  if (missingCount <= Math.max(1, Math.floor(totalCount / 3))) return 'warn'
  return 'bad'
}

export function CartDrawer({ items, open, patient, onClose, onCheckout, onRemove, onClear, onSetQty, onCheck, onReserve }: Props) {
  const [tab, setTab] = useState<Tab>('cart')
  const [loadingCheck, setLoadingCheck] = useState(false)
  const [hits, setHits] = useState<InteractionHit[] | null>(null)
  const [ordering, setOrdering] = useState(false)
  const [order, setOrder] = useState<ReserveResponse | null>(null)
  const [orderErr, setOrderErr] = useState('')

  useEffect(() => {
    if (!open) return
    setTab('cart')
    setHits(null)
    setOrder(null)
    setOrderErr('')
  }, [open])

  const headline = useMemo(() => {
    if (items.length === 0) return 'سلة التحليل'
    return `سلة التحليل (${items.length})`
  }, [items.length])

  const totals = useMemo(() => {
    const priced = items.filter(i => typeof i.avg_price === 'number')
    const subtotal = priced.reduce((sum, it) => sum + (Number(it.avg_price || 0) || 0) * (it.qty || 1), 0)
    const withPrice = priced.length
    const count = items.reduce((sum, it) => sum + (it.qty || 1), 0)
    return { subtotal, withPrice, count }
  }, [items])

  const pharmacies = useMemo<PharmacyPick[]>(() => {
    const map = new Map<number, { pharmacy_id: number, name: string, address: string, total: number, missing: string[] }>()
    for (const it of items) {
      const locs = it.available_locations || []
      for (const loc of locs) {
        const cur = map.get(loc.pharmacy_id) || { pharmacy_id: loc.pharmacy_id, name: loc.name, address: loc.address, total: 0, missing: [] }
        cur.total += (Number(loc.price || 0) || 0) * (it.qty || 1)
        map.set(loc.pharmacy_id, cur)
      }
    }

    const out = Array.from(map.values()).map(p => {
      const missing = items
        .filter(it => !(it.available_locations || []).some(l => l.pharmacy_id === p.pharmacy_id))
        .map(it => it.trade_name)
      const status = pickStatus(missing.length, items.length)
      return { ...p, missing, status }
    })

    out.sort((a, b) => {
      const rank = (s: PharmacyPick['status']) => (s === 'good' ? 0 : s === 'warn' ? 1 : 2)
      const ra = rank(a.status)
      const rb = rank(b.status)
      if (ra !== rb) return ra - rb
      if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length
      return a.total - b.total
    })

    return out.slice(0, 6)
  }, [items])

  const canCheck = items.length >= 2
  const canReserve = items.length > 0 && pharmacies.length > 0
  const canCheckout = items.length > 0

  async function runCheck() {
    setLoadingCheck(true)
    try {
      const out = await onCheck()
      setHits(out)
      setTab('interactions')
    } finally {
      setLoadingCheck(false)
    }
  }

  async function reserve(pharmacy_id: number) {
    setOrderErr('')
    setOrdering(true)
    try {
      const out = await onReserve(pharmacy_id)
      setOrder(out)
    } catch {
      setOrderErr('مش قادر أحجز دلوقتي… جرّب تاني.')
      setOrder(null)
    } finally {
      setOrdering(false)
    }
  }

  function decQty(it: CartItem) {
    const next = Math.max(1, (it.qty || 1) - 1)
    onSetQty(it.drug_id, next)
  }

  function incQty(it: CartItem) {
    const next = Math.min(9, (it.qty || 1) + 1)
    onSetQty(it.drug_id, next)
  }

  function statusLabel(s: PharmacyPick['status']) {
    if (s === 'good') return 'مناسب لك'
    if (s === 'warn') return 'تحذير'
    return 'غير مناسب'
  }

  if (!open) return null

  return (
    <div className="sp-drawer" role="dialog" aria-modal="true">
      <div className="sp-drawer-card sp-drawer-card--wide">
        <div className="sp-drawer-head">
          <div>
            <div className="sp-drawer-title">{headline}</div>
            <div className="sp-drawer-sub">
              {totals.count > 0 ? <span>📦 {totals.count} قطعة</span> : <span>ابدأ بإضافة أدوية من البحث أو الروشتة</span>}
              {totals.withPrice > 0 ? <span> • {money(totals.subtotal)}</span> : null}
              {patient.allergies?.length ? <span> • 🚫 حساسية {patient.allergies.length}</span> : null}
            </div>
          </div>
          <button className="sp-btn ghost" onClick={onClose} type="button">إغلاق</button>
        </div>

        <div className="sp-cart-tabs" role="tablist" aria-label="Cart tabs">
          <button className={`sp-tabbtn ${tab === 'cart' ? 'is-active' : ''}`} onClick={() => setTab('cart')} type="button" role="tab">السلة</button>
          <button className={`sp-tabbtn ${tab === 'interactions' ? 'is-active' : ''}`} onClick={() => setTab('interactions')} type="button" role="tab" disabled={!canCheck}>التفاعلات</button>
          <button className={`sp-tabbtn ${tab === 'reserve' ? 'is-active' : ''}`} onClick={() => setTab('reserve')} type="button" role="tab" disabled={!canReserve}>الحجز</button>
        </div>

        <div className="sp-drawer-body">
          {tab === 'cart' && (
            <>
              {items.length === 0 && <div className="sp-empty-small">ضيف أدوية من نتائج البحث أو الروشتة… وبعدين نحلل التفاعلات ونرشّح صيدلية.</div>}

              {items.length > 0 && (
                <div className="sp-cart-list">
                  {items.map((it) => (
                    <div key={it.drug_id} className="sp-cart-item sp-cart-item--rich">
                      <div className="sp-cart-main">
                        <div className="sp-cart-name">{it.trade_name}</div>
                        <div className="sp-cart-sub">{it.active_ingredient}</div>
                        {typeof it.avg_price === 'number' ? (
                          <div className="sp-cart-price">{money((it.avg_price || 0) * (it.qty || 1))}</div>
                        ) : (
                          <div className="sp-cart-price sp-muted">السعر غير متاح</div>
                        )}
                      </div>

                      <div className="sp-cart-right">
                        <div className="sp-qty">
                          <button className="sp-qty__btn" onClick={() => decQty(it)} type="button" aria-label="decrease">−</button>
                          <div className="sp-qty__val">{it.qty || 1}</div>
                          <button className="sp-qty__btn" onClick={() => incQty(it)} type="button" aria-label="increase">+</button>
                        </div>
                        <button className="sp-btn danger sp-btn--sm" onClick={() => onRemove(it.drug_id)} type="button">حذف</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="sp-cart-footer">
                <div className="sp-cart-footer__left">
                  <button className="sp-btn secondary" onClick={onClear} disabled={items.length === 0} type="button">تفريغ السلة</button>
                  <button className="sp-btn" onClick={runCheck} disabled={!canCheck || loadingCheck} type="button">{loadingCheck ? 'جاري التحليل…' : 'تحليل التفاعلات'}</button>
                </div>
                <div className="sp-cart-footer__right">
                  <button className="sp-btn success" onClick={() => setTab('reserve')} disabled={!canReserve} type="button">اختار صيدلية</button>
                </div>
              </div>

              <div className="sp-cart-footer sp-cart-footer--tight">
                <div className="sp-cart-footer__left">
                  <button className="sp-btn ghost" onClick={onClose} type="button">كمل لاحقًا</button>
                </div>
                <div className="sp-cart-footer__right">
                  <button className="sp-btn primary" onClick={onCheckout} disabled={items.length === 0} type="button">إتمام الحجز</button>
                </div>
              </div>
            </>
          )}

          {tab === 'interactions' && (
            <>
              {!hits && (
                <div className="sp-section">
                  <div className="sp-section-title">تحليل التفاعلات</div>
                  <div className="sp-empty-small">اضغط "تحليل التفاعلات" من السلة علشان نعرض النتيجة هنا.</div>
                </div>
              )}

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

              <div className="sp-cart-footer">
                <div className="sp-cart-footer__left">
                  <button className="sp-btn secondary" onClick={() => setTab('cart')} type="button">رجوع للسلة</button>
                </div>
                <div className="sp-cart-footer__right">
                  <button className="sp-btn success" onClick={() => setTab('reserve')} disabled={!canReserve} type="button">اختار صيدلية</button>
                </div>
              </div>
            </>
          )}

          {tab === 'reserve' && (
            <>
              <div className="sp-section">
                <div className="sp-section-title">حجز من صيدلية</div>

                {items.length === 0 && <div className="sp-empty-small">ضيف أدوية الأول عشان نعرض أقرب/أفضل صيدلية.</div>}

                {items.length > 0 && pharmacies.length === 0 && (
                  <div className="sp-empty-small">مفيش بيانات توافر كفاية دلوقتي. جرّب بحث تاني أو فعّل بيانات صيدليات شريكة.</div>
                )}

                {items.length > 0 && pharmacies.length > 0 && (
                  <div className="sp-cart-pharmacies">
                    {pharmacies.map(p => (
                      <div key={p.pharmacy_id} className={`sp-pharmacy-card ${p.status}`}>
                        <div className="sp-pharmacy-top">
                          <div>
                            <div className="sp-pharmacy-name">{p.name}</div>
                            <div className="sp-pharmacy-sub">{p.address || 'بدون عنوان'}</div>
                          </div>
                          <div className="sp-pharmacy-meta">
                            <span className={`sp-statuspill ${p.status}`}>{statusLabel(p.status)}</span>
                            <div className="sp-pharmacy-total">{money(p.total)}</div>
                          </div>
                        </div>

                        {p.missing.length > 0 && (
                          <div className="sp-pharmacy-missing">ناقص: {p.missing.slice(0, 3).join('، ')}{p.missing.length > 3 ? '…' : ''}</div>
                        )}

                        <div className="sp-pharmacy-actions">
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
                    <div className="sp-order-lines">
                      {order.items.map((it, i) => (
                        <div key={i} className="sp-order-line">
                          <div className="sp-order-name">{it.trade_name}</div>
                          <div className="sp-order-right">
                            <span className={`sp-statuspill ${it.available ? 'good' : 'bad'}`}>{it.available ? 'متوفر' : 'غير متوفر'}</span>
                            <span className="sp-order-qty">×{it.qty}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="sp-order-total">الإجمالي: {money(order.total)}</div>
                  </div>
                )}
              </div>

              <div className="sp-cart-footer">
                <div className="sp-cart-footer__left">
                  <button className="sp-btn secondary" onClick={() => setTab('cart')} type="button">رجوع للسلة</button>
                </div>
                <div className="sp-cart-footer__right">
                  <button className="sp-btn secondary" onClick={onClose} type="button">إغلاق</button>
                  <button className="sp-btn primary" onClick={onCheckout} disabled={!canCheckout} type="button">إتمام الحجز</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
