import { useMemo, useRef, useState } from 'react'
import type { PatientContext } from '../types'
import { computeSuitability } from '../lib/safety'
import { apiOcr, apiPrescriptionValidate, apiSearch } from '../lib/api'

type Props = {
  patient: PatientContext
  onGoSearch: () => void
  onAddToCart: (meds: string[]) => Promise<void>
}

type Step = 'upload' | 'confirm' | 'results'

function uniq(list: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const x of list) {
    const v = String(x || '').trim()
    if (!v) continue
    const k = v.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    out.push(v)
  }
  return out
}

function levelMeta(level: string) {
  if (level === 'danger') return { cls: 'danger', icon: '⛔' }
  if (level === 'warn') return { cls: 'warn', icon: '⚠️' }
  return { cls: 'info', icon: 'ℹ️' }
}

export function PrescriptionValidator({ patient, onGoSearch, onAddToCart }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<Step>('upload')
  const [busy, setBusy] = useState(false)
  const [meds, setMeds] = useState<string[]>([])
  const [addVal, setAddVal] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [result, setResult] = useState<any>(null)

  const canValidate = meds.length > 0 && !busy

  const header = useMemo(() => {
    if (step === 'upload') return { title: 'تحقق الروشتة', sub: 'ارفع الروشتة… وهنطلع لك تحذيرات وبدائل وسعر تقريبي.' }
    if (step === 'confirm') return { title: 'تأكيد الأدوية', sub: 'اتأكد إن الأسماء صح قبل التحليل.' }
    return { title: 'النتيجة', sub: 'دي الخلاصة… ركّز على التحذيرات قبل الاستخدام.' }
  }, [step])

  async function handleFile(file: File) {
    setErr('')
    setBusy(true)
    setResult(null)
    try {
      const names = await apiOcr(file)
      const list = uniq(Array.isArray(names) ? names : [])
      if (!list.length) {
        setErr('مش قادر أقرأ الروشتة… جرّب صورة أوضح.')
        setStep('upload')
        return
      }
      setMeds(list.slice(0, 10))
      setStep('confirm')
    } catch {
      setErr('في مشكلة أثناء تحليل الصورة. جرّب تاني.')
      setStep('upload')
    } finally {
      setBusy(false)
    }
  }

  async function fetchSuggestions(q: string) {
    const v = q.trim()
    if (v.length < 2) {
      setSuggestions([])
      return
    }
    try {
      const hits = await apiSearch(v)
      const names = uniq(hits.map(x => String(x.trade_name || '')).filter(Boolean)).slice(0, 6)
      setSuggestions(names)
    } catch {
      setSuggestions([])
    }
  }

  function addMed(name?: string) {
    const v = String(name ?? addVal).trim()
    if (!v) return
    const next = uniq([...meds, v]).slice(0, 12)
    setMeds(next)
    setAddVal('')
    setSuggestions([])
  }

  function removeMed(idx: number) {
    const next = meds.filter((_, i) => i !== idx)
    setMeds(next)
  }

  async function validateNow() {
    if (!canValidate) return
    setBusy(true)
    setErr('')
    try {
      const out = await apiPrescriptionValidate(meds, patient)
      setResult(out)
      setStep('results')
    } catch (e: any) {
      setErr(String(e?.message || 'فشل التحليل.'))
    } finally {
      setBusy(false)
    }
  }

  const flags = Array.isArray(result?.flags) ? result.flags : []
  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { danger: [], warn: [], info: [] }
    for (const f of flags) {
      const lvl = String(f.level || 'info')
      if (!g[lvl]) g[lvl] = []
      g[lvl].push(f)
    }
    return g
  }, [flags])

  return (
    <section className="sp-rx" aria-label="Prescription Validator">
      <div className="sp-rx__top">
        <div>
          <div className="sp-rx__title">{header.title}</div>
          <div className="sp-rx__sub">{header.sub}</div>
        </div>
        <div className="sp-rx__topActions">
          <button className="sp-btn ghost" type="button" onClick={onGoSearch}>🔎 بحث</button>
          {step !== 'upload' ? (
            <button className="sp-btn secondary" type="button" onClick={() => { setStep('upload'); setResult(null); setErr(''); }}>🔁 روشتة جديدة</button>
          ) : null}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          handleFile(f)
          e.currentTarget.value = ''
        }}
      />

      <div className="sp-card sp-rx__card">
        <div className="sp-rx__steps" aria-label="Steps">
          <div className={`sp-step ${step === 'upload' ? 'is-active' : step !== 'upload' ? 'is-done' : ''}`}>
            <div className="sp-step__dot">{step === 'upload' ? '1' : '✓'}</div>
            <div className="sp-step__label">رفع الروشتة</div>
          </div>
          <div className={`sp-step ${step === 'confirm' ? 'is-active' : step === 'results' ? 'is-done' : ''}`}>
            <div className="sp-step__dot">{step === 'confirm' ? '2' : step === 'results' ? '✓' : '2'}</div>
            <div className="sp-step__label">تأكيد الأدوية</div>
          </div>
          <div className={`sp-step ${step === 'results' ? 'is-active' : ''}`}>
            <div className="sp-step__dot">3</div>
            <div className="sp-step__label">نتيجة آمنة</div>
          </div>
        </div>

        {err ? <div className="sp-alert danger">{err}</div> : null}

        {step === 'upload' ? (
          <div className="sp-rx__upload">
            <div className="sp-rx__uploadBox">
              <div className="sp-rx__uploadIcon">📷</div>
              <div className="sp-rx__uploadTitle">ارفع صورة الروشتة</div>
              <div className="sp-rx__uploadHint">خلي الصورة واضحة وقريبة… من غير فلاش لو ينفع.</div>
              <button className="sp-btn primary" type="button" disabled={busy} onClick={() => fileRef.current?.click()}>
                {busy ? 'جاري التحليل…' : 'اختيار صورة'}
              </button>
            </div>

            <div className="sp-rx__or">أو</div>

            <div className="sp-rx__manual">
              <div className="sp-rx__manualTitle">اكتب أسماء الأدوية يدويًا</div>
              <div className="sp-rx__add">
                <input
                  className="sp-input"
                  value={addVal}
                  onChange={(e) => { setAddVal(e.target.value); fetchSuggestions(e.target.value) }}
                  placeholder="مثال: Panadol"
                />
                <button className="sp-btn success" type="button" onClick={() => addMed()} disabled={!addVal.trim() || busy}>إضافة</button>
              </div>
              {suggestions.length ? (
                <div className="sp-rx__sugg" role="list">
                  {suggestions.map(s => (
                    <button key={s} className="sp-chip" type="button" onClick={() => addMed(s)}>{s}</button>
                  ))}
                </div>
              ) : null}

              {meds.length ? (
                <div className="sp-rx__pilllist">
                  {meds.map((m, i) => (
                    <div key={`${m}-${i}`} className="sp-medpill">
                      <span className="sp-medpill__text">{m}</span>
                      <button className="sp-medpill__x" type="button" onClick={() => removeMed(i)} aria-label="Remove">×</button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="sp-rx__actions">
                <button className="sp-btn primary" type="button" onClick={() => { setStep('confirm') }} disabled={!meds.length || busy}>التالي</button>
              </div>
            </div>
          </div>
        ) : null}

        {step === 'confirm' ? (
          <div className="sp-rx__confirm">
            <div className="sp-rx__confirmHead">
              <div className="sp-rx__confirmTitle">الأدوية اللي هنحللها</div>
              <div className="sp-rx__confirmHint">احذف/أضف أي اسم غلط قبل المتابعة.</div>
            </div>

            <div className="sp-rx__pilllist">
              {meds.map((m, i) => (
                <div key={`${m}-${i}`} className="sp-medpill">
                  <span className="sp-medpill__text">{m}</span>
                  <button className="sp-medpill__x" type="button" onClick={() => removeMed(i)} aria-label="Remove">×</button>
                </div>
              ))}
            </div>

            <div className="sp-rx__addRow">
              <input
                className="sp-input"
                value={addVal}
                onChange={(e) => { setAddVal(e.target.value); fetchSuggestions(e.target.value) }}
                placeholder="أضف دواء تاني…"
              />
              <button className="sp-btn success" type="button" onClick={() => addMed()} disabled={!addVal.trim() || busy}>إضافة</button>
            </div>

            {suggestions.length ? (
              <div className="sp-rx__sugg" role="list">
                {suggestions.map(s => (
                  <button key={s} className="sp-chip" type="button" onClick={() => addMed(s)}>{s}</button>
                ))}
              </div>
            ) : null}

            <div className="sp-rx__actions">
              <button className="sp-btn ghost" type="button" onClick={() => setStep('upload')}>رجوع</button>
              <button className="sp-btn primary" type="button" disabled={!canValidate} onClick={validateNow}>
                {busy ? 'جاري التحقق…' : 'تحقق الروشتة'}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'results' ? (
          <div className="sp-rx__results">
            <div className="sp-rx__summary">
              <div className="sp-rx__summaryTitle">ملخص سريع</div>
              <div className="sp-rx__summaryGrid">
                <div className="sp-mini">
                  <div className="sp-mini__k">عدد الأدوية</div>
                  <div className="sp-mini__v">{Array.isArray(result?.items) ? result.items.length : meds.length}</div>
                </div>
                <div className="sp-mini">
                  <div className="sp-mini__k">تحذيرات</div>
                  <div className="sp-mini__v">{(grouped.warn?.length || 0) + (grouped.danger?.length || 0)}</div>
                </div>
                <div className="sp-mini">
                  <div className="sp-mini__k">تداخلات</div>
                  <div className="sp-mini__v">{Array.isArray(result?.interactions) ? result.interactions.length : 0}</div>
                </div>
              </div>
            </div>

            <div className="sp-rx__flags">
              {(['danger', 'warn', 'info'] as const).map((k) => {
                const list = grouped[k] || []
                if (!list.length) return null
                const meta = levelMeta(k)
                return (
                  <div key={k} className={`sp-flaggroup ${meta.cls}`}>
                    <div className="sp-flaggroup__head">
                      <div className="sp-flaggroup__title">{meta.icon} {k === 'danger' ? 'خطر' : k === 'warn' ? 'تحذير' : 'ملاحظات'}</div>
                      <div className="sp-flaggroup__count">{list.length}</div>
                    </div>
                    <div className="sp-flaggroup__list">
                      {list.map((f: any, idx: number) => (
                        <div key={idx} className="sp-flag">
                          <div className="sp-flag__title">{String(f.title || '')}</div>
                          <div className="sp-flag__msg">{String(f.message || '')}</div>
                          {Array.isArray(f.related) && f.related.length ? (
                            <div className="sp-flag__rel">{f.related.slice(0, 6).join(' • ')}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="sp-rx__items">
              <div className="sp-rx__itemsTitle">تفاصيل الأدوية</div>
              <div className="sp-rx__itemsGrid">
                {(Array.isArray(result?.items) ? result.items : []).map((it: any, idx: number) => {
                  const m = it?.match
                  const trade = String(m?.trade_name || it?.input || '')
                  const active = String(m?.active_ingredient || '')
                  const price = m?.avg_price !== undefined ? Number(m.avg_price) : null
                  const alts = result?.alternatives?.[trade] || []
                  return (
                    <div key={idx} className="sp-drugcard">
                      <div className="sp-drugcard__top">
                        <div className="sp-drugcard__name">{trade || 'غير معروف'}</div>
                        {price !== null && Number.isFinite(price) ? <div className="sp-drugcard__price">{price} ج</div> : null}
                      </div>
                      {active ? <div className="sp-drugcard__active">المادة: {active}</div> : <div className="sp-drugcard__active muted">مش متأكد من الدواء… جرّب تعديل الاسم.</div>}
                      {Array.isArray(alts) && alts.length ? (
                        <div className="sp-drugcard__alts">
                          <div className="sp-drugcard__altsTitle">بدائل بنفس المادة</div>
                          <div className="sp-drugcard__altList">
                            {alts.slice(0, 4).map((a: any, i2: number) => (
                              <div key={i2} className="sp-alt">
                                <div className="sp-alt__n">{a.trade_name}</div>
                                {a.avg_price !== undefined ? <div className="sp-alt__p">{Number(a.avg_price)} ج</div> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="sp-rx__actions">
              <button className="sp-btn secondary" type="button" onClick={() => setStep('confirm')}>تعديل الأدوية</button>
              <button className="sp-btn success" type="button" disabled={busy || meds.length === 0} onClick={() => onAddToCart(meds)}>ابدأ الحجز</button>
              <button className="sp-btn primary" type="button" onClick={() => { setStep('upload'); setResult(null); setErr(''); setMeds([]) }}>تحقق روشتة جديدة</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className="sp-rx__foot">
        <div className="sp-rx__disclaimer">
          النتائج للمساعدة فقط وليست بديلًا عن الصيدلي/الطبيب. لو فيه أعراض شديدة أو تحذير خطر، راجع مختص فورًا.
        </div>
      </div>
    </section>
  )
}
