import { useEffect, useMemo, useState } from 'react'
import type { CartItem, PatientContext } from '../types'
import { apiPharmacies, apiReserveOrder, type ReserveResponse } from '../lib/api'

type Method = 'pickup' | 'delivery'

type PharmacyView = {
  pharmacy_id: number
  name: string
  address: string
  total: number
  missing: string[]
  status: 'good' | 'warn' | 'bad'
}

type Props = {
  items: CartItem[]
  patient: PatientContext
  initialPharmacyId?: number | null
  onBack: () => void
  onDone: () => void
  onClearCart: () => void
}

function money(n: number) {
  const v = Math.round(Number.isFinite(n) ? n : 0)
  return `${v} ج.م`
}

function pickStatus(missingCount: number, totalCount: number): PharmacyView['status'] {
  if (totalCount <= 0) return 'warn'
  if (missingCount === 0) return 'good'
  if (missingCount <= Math.max(1, Math.floor(totalCount / 3))) return 'warn'
  return 'bad'
}

function statusLabel(s: PharmacyView['status']) {
  if (s === 'good') return 'مناسب لك'
  if (s === 'warn') return 'تحذير'
  return 'غير مناسب'
}

export function CheckoutPage({ items, patient, initialPharmacyId, onBack, onDone, onClearCart }: Props) {
  const [method, setMethod] = useState<Method>('pickup')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')
  const [pharmacies, setPharmacies] = useState<any[] | null>(null)
  const [loadingPh, setLoadingPh] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [err, setErr] = useState('')
  const [order, setOrder] = useState<ReserveResponse | null>(null)
  const [selected, setSelected] = useState<number | null>(initialPharmacyId ?? null)

  useEffect(() => {
    let mounted = true
    setLoadingPh(true)
    apiPharmacies()
      .then((p) => { if (mounted) setPharmacies(p) })
      .catch(() => { if (mounted) setPharmacies([]) })
      .finally(() => { if (mounted) setLoadingPh(false) })
    return () => { mounted = false }
  }, [])

  const suggestions = useMemo<PharmacyView[]>(() => {
    const base = Array.isArray(pharmacies) ? pharmacies : []
    const map = new Map<number, PharmacyView>()

    for (const p of base) {
      const id = Number(p.pharmacy_id || p.id || 0)
      if (!id) continue
      map.set(id, {
        pharmacy_id: id,
        name: String(p.name || 'صيدلية'),
        address: String(p.address || ''),
        total: 0,
        missing: [],
        status: 'warn'
      })
    }

    for (const it of items) {
      const locs = it.available_locations || []
      for (const loc of locs) {
        const cur = map.get(loc.pharmacy_id) || {
          pharmacy_id: loc.pharmacy_id,
          name: String(loc.name || 'صيدلية'),
          address: String(loc.address || ''),
          total: 0,
          missing: [],
          status: 'warn'
        }
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
      const rank = (s: PharmacyView['status']) => (s === 'good' ? 0 : s === 'warn' ? 1 : 2)
      const ra = rank(a.status)
      const rb = rank(b.status)
      if (ra !== rb) return ra - rb
      if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length
      return a.total - b.total
    })

    return out.slice(0, 10)
  }, [items, pharmacies])

  useEffect(() => {
    if (selected) return
    if (suggestions.length === 0) return
    setSelected(suggestions[0].pharmacy_id)
  }, [selected, suggestions])

  const summary = useMemo(() => {
    const count = items.reduce((s, it) => s + (it.qty || 1), 0)
    const approx = items.reduce((s, it) => s + (Number(it.avg_price || 0) || 0) * (it.qty || 1), 0)
    return { count, approx }
  }, [items])

  const selectedView = useMemo(() => suggestions.find(s => s.pharmacy_id === selected) || null, [selected, suggestions])

  async function place() {
    if (!selected) {
      setErr('اختار صيدلية الأول.')
      return
    }
    if (method === 'delivery') {
      const p = phone.trim()
      const a = address.trim()
      if (p.length < 8 || !/^\+?\d[\d\s-]{7,}$/.test(p)) {
        setErr('اكتب رقم موبايل صحيح.')
        return
      }
      if (a.length < 6) {
        setErr('اكتب عنوان التوصيل بشكل أوضح.')
        return
      }
    }

    setErr('')
    setPlacing(true)
    try {
      const payload = items.map(x => ({ trade_name: x.trade_name, qty: x.qty || 1 }))
      const ctx = {
        ...patient,
        delivery: method === 'delivery' ? { phone: phone.trim(), address: address.trim(), notes: notes.trim() } : null
      } as any
      const out = await apiReserveOrder(selected, payload, ctx)
      setOrder(out)
    } catch {
      setErr('حصلت مشكلة في الحجز… جرّب تاني.')
      setOrder(null)
    } finally {
      setPlacing(false)
    }
  }

  function reset() {
    setOrder(null)
    setErr('')
  }

  return (
    <section className="sp-checkout">
      <div className="sp-checkout__hero">
        <div>
          <div className="sp-checkout__title">إتمام الحجز</div>
          <div className="sp-checkout__sub">
            <span>🧾 {items.length} صنف</span>
            <span> • 📦 {summary.count} قطعة</span>
            {summary.approx > 0 ? <span> • تقريبيًا {money(summary.approx)}</span> : null}
          </div>
        </div>
        <div className="sp-checkout__actions">
          <button className="sp-btn secondary" onClick={onBack} type="button">رجوع</button>
          <button className="sp-btn ghost" onClick={onDone} type="button">الرئيسية</button>
        </div>
      </div>

      <div className="sp-checkout__grid">
        <div className="sp-checkout__panel">
          <div className="sp-panel-head">
            <div className="sp-panel-title">1) اختيار طريقة الاستلام</div>
            <div className="sp-panel-hint">اختار اللي يناسبك</div>
          </div>
          <div className="sp-method">
            <button className={`sp-choice ${method === 'pickup' ? 'is-active' : ''}`} onClick={() => setMethod('pickup')} type="button">
              <div className="sp-choice__t">استلام من الصيدلية</div>
              <div className="sp-choice__d">الأسرع وبدون رسوم توصيل</div>
            </button>
            <button className={`sp-choice ${method === 'delivery' ? 'is-active' : ''}`} onClick={() => setMethod('delivery')} type="button">
              <div className="sp-choice__t">توصيل للمنزل</div>
              <div className="sp-choice__d">اكتب العنوان ورقم الموبايل</div>
            </button>
          </div>

          {method === 'delivery' && (
            <div className="sp-form">
              <div className="sp-field">
                <label>رقم الموبايل</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="مثال: 010xxxxxxx" />
              </div>
              <div className="sp-field">
                <label>عنوان التوصيل</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="الحي، الشارع، رقم العمارة" />
              </div>
              <div className="sp-field">
                <label>ملاحظات (اختياري)</label>
                <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="مثال: الدور الثالث، اتصل قبل الوصول" />
              </div>
            </div>
          )}
        </div>

        <div className="sp-checkout__panel">
          <div className="sp-panel-head">
            <div className="sp-panel-title">2) أفضل صيدليات للحجز</div>
            <div className="sp-panel-hint">بنرتّبها حسب التوافر والسعر</div>
          </div>

          {loadingPh && <div className="sp-loading">🔄 جاري تحميل الصيدليات…</div>}

          {!loadingPh && suggestions.length === 0 && (
            <div className="sp-empty-small">مفيش صيدليات متاحة دلوقتي. جرّب تاني بعد شوية أو ابحث عن دواء مختلف.</div>
          )}

          {!loadingPh && suggestions.length > 0 && (
            <div className="sp-ph-list">
              {suggestions.map((p) => (
                <button key={p.pharmacy_id} className={`sp-ph-pick ${selected === p.pharmacy_id ? 'is-active' : ''} ${p.status}`} onClick={() => { reset(); setSelected(p.pharmacy_id) }} type="button">
                  <div className="sp-ph-left">
                    <div className="sp-ph-name">{p.name}</div>
                    <div className="sp-ph-addr">{p.address || 'بدون عنوان'}</div>
                    {p.missing.length > 0 ? <div className="sp-ph-missing">ناقص: {p.missing.slice(0, 2).join('، ')}{p.missing.length > 2 ? '…' : ''}</div> : <div className="sp-ph-missing ok">كل الأصناف متوفرة</div>}
                  </div>
                  <div className="sp-ph-right">
                    <span className={`sp-statuspill ${p.status}`}>{statusLabel(p.status)}</span>
                    <div className="sp-ph-total">{money(p.total || summary.approx)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="sp-checkout__panel sp-checkout__panel--sticky">
          <div className="sp-panel-head">
            <div className="sp-panel-title">3) تأكيد الحجز</div>
            <div className="sp-panel-hint">راجع ملخصك واضغط تأكيد</div>
          </div>

          <div className="sp-summary">
            <div className="sp-summary-row">
              <span>الصيدلية</span>
              <span>{selectedView ? selectedView.name : '—'}</span>
            </div>
            <div className="sp-summary-row">
              <span>الاستلام</span>
              <span>{method === 'pickup' ? 'من الصيدلية' : 'توصيل'}</span>
            </div>
            <div className="sp-summary-row">
              <span>عدد القطع</span>
              <span>{summary.count}</span>
            </div>
            <div className="sp-summary-row">
              <span>إجمالي تقريبي</span>
              <span>{money(selectedView?.total || summary.approx)}</span>
            </div>
          </div>

          {err ? <div className="sp-checkout__err">{err}</div> : null}

          {!order && (
            <button className="sp-btn primary sp-btn--wide" onClick={place} disabled={placing || items.length === 0 || !selected} type="button">
              {placing ? 'جاري تأكيد الحجز…' : 'تأكيد الحجز'}
            </button>
          )}

          {order?.ok && (
            <div className="sp-order-success sp-order-success--card">
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
              <div className="sp-checkout__done">
                <button className="sp-btn secondary" onClick={() => { onClearCart(); onDone() }} type="button">إنهاء</button>
                <button className="sp-btn ghost" onClick={onBack} type="button">رجوع للتعديل</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
