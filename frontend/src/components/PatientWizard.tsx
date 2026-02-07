import { useEffect, useMemo, useState } from 'react'
import type { PatientContext } from '../types'

type Props = {
  open: boolean
  initial: PatientContext
  onClose: () => void
  onSave: (ctx: PatientContext) => void
}

function clampNumber(v: string, min: number, max: number): number | undefined {
  const n = Number(v)
  if (!Number.isFinite(n)) return undefined
  const c = Math.max(min, Math.min(max, n))
  return c
}

function splitList(input: string): string[] {
  return input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 40)
}

function sexLabel(v: PatientContext['sex']) {
  if (v === 'male') return 'ذكر'
  if (v === 'female') return 'أنثى'
  return 'مفضّلش أقول'
}

export function PatientWizard({ open, initial, onClose, onSave }: Props) {
  const [step, setStep] = useState(0)
  const [age, setAge] = useState<string>(initial.age ? String(initial.age) : '')
  const [weight, setWeight] = useState<string>(initial.weightKg ? String(initial.weightKg) : '')
  const [sex, setSex] = useState<PatientContext['sex']>(initial.sex || 'other')
  const [allergyDraft, setAllergyDraft] = useState<string>(initial.allergies.join(', '))
  const [condDraft, setCondDraft] = useState<string>(initial.conditions.join(', '))
  const [medDraft, setMedDraft] = useState<string>(initial.currentMeds.join(', '))

  useEffect(() => {
    if (!open) return
    setStep(0)
    setAge(initial.age ? String(initial.age) : '')
    setWeight(initial.weightKg ? String(initial.weightKg) : '')
    setSex(initial.sex || 'other')
    setAllergyDraft(initial.allergies.join(', '))
    setCondDraft(initial.conditions.join(', '))
    setMedDraft(initial.currentMeds.join(', '))
  }, [open, initial])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])


  const allergies = useMemo(() => splitList(allergyDraft), [allergyDraft])
  const conditions = useMemo(() => splitList(condDraft), [condDraft])
  const currentMeds = useMemo(() => splitList(medDraft), [medDraft])

  const progress = useMemo(() => {
    const labels = ['بيانات أساسية', 'حساسية', 'أدوية وحالات']
    return { labels, active: step }
  }, [step])

  const canNext = useMemo(() => {
    if (step === 0) return true
    if (step === 1) return true
    return true
  }, [step])

  function next() {
    if (!canNext) return
    setStep(s => Math.min(2, s + 1))
  }

  function back() {
    setStep(s => Math.max(0, s - 1))
  }

  function save() {
    const ctx: PatientContext = {
      age: clampNumber(age, 0, 120),
      weightKg: clampNumber(weight, 1, 400),
      sex,
      allergies,
      conditions,
      currentMeds
    }
    onSave(ctx)
  }

  if (!open) return null

  return (
    <div className="sp-modal" role="dialog" aria-modal="true">
      <div className="sp-modal-card sp-wizard">
        <div className="sp-wizard__top">
          <div>
            <div className="sp-modal-title">البدء السريع</div>
            <div className="sp-modal-sub">خلّي التجربة أذكى عليك: حساسية، تحذيرات، وإجابات أدق</div>
          </div>
          <button className="sp-icon-btn" onClick={onClose} aria-label="Close" type="button">✕</button>
        </div>

        <div className="sp-steps" aria-label="Progress">
          {progress.labels.map((t, i) => (
            <div key={t} className={`sp-step ${i === progress.active ? 'is-active' : i < progress.active ? 'is-done' : ''}`}>
              <span className="sp-step__dot" />
              <span className="sp-step__label">{t}</span>
            </div>
          ))}
        </div>

        {step === 0 && (
          <div className="sp-wizard__pane">
            <div className="sp-fieldrow">
              <div className="sp-field">
                <label className="sp-label">السن</label>
                <input className="sp-input" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)} placeholder="مثال: 28" />
              </div>
              <div className="sp-field">
                <label className="sp-label">الوزن (كجم)</label>
                <input className="sp-input" inputMode="numeric" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="اختياري" />
              </div>
            </div>

            <div className="sp-field">
              <label className="sp-label">النوع</label>
              <div className="sp-seg" role="group" aria-label="Sex">
                {(['male', 'female', 'other'] as const).map(v => (
                  <button
                    key={v}
                    type="button"
                    className={`sp-seg__btn ${sex === v ? 'is-active' : ''}`}
                    onClick={() => setSex(v)}
                  >
                    {sexLabel(v)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="sp-wizard__pane">
            <label className="sp-label">حساسية من مواد فعالة</label>
            <textarea
              className="sp-textarea"
              value={allergyDraft}
              onChange={(e) => setAllergyDraft(e.target.value)}
              placeholder="مثال: paracetamol, ibuprofen"
              rows={3}
            />
            <div className="sp-chiprow">
              {allergies.map(a => <span key={a} className="sp-chip">{a}</span>)}
              {allergies.length === 0 && <span className="sp-muted">مفيش بيانات</span>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="sp-wizard__pane">
            <label className="sp-label">حالات مزمنة</label>
            <textarea
              className="sp-textarea"
              value={condDraft}
              onChange={(e) => setCondDraft(e.target.value)}
              placeholder="مثال: ضغط, سكر"
              rows={2}
            />
            <div className="sp-chiprow">
              {conditions.map(a => <span key={a} className="sp-chip">{a}</span>)}
              {conditions.length === 0 && <span className="sp-muted">مفيش بيانات</span>}
            </div>

            <div style={{ height: 12 }} />

            <label className="sp-label">أدوية بتستخدمها حاليًا</label>
            <textarea
              className="sp-textarea"
              value={medDraft}
              onChange={(e) => setMedDraft(e.target.value)}
              placeholder="مثال: metformin, amlodipine"
              rows={2}
            />
            <div className="sp-chiprow">
              {currentMeds.map(a => <span key={a} className="sp-chip">{a}</span>)}
              {currentMeds.length === 0 && <span className="sp-muted">مفيش بيانات</span>}
            </div>
          </div>
        )}

        <div className="sp-wizard__actions">
          <div className="sp-wizard__left">
            <button className="sp-btn ghost" onClick={onClose} type="button">تخطي الآن</button>
            {step > 0 && <button className="sp-btn secondary" onClick={back} type="button">رجوع</button>}
          </div>
          <div className="sp-wizard__right">
            {step < 2 && <button className="sp-btn primary" onClick={next} disabled={!canNext} type="button">التالي</button>}
            {step === 2 && <button className="sp-btn success" onClick={save} type="button">حفظ وابدأ</button>}
          </div>
        </div>
      </div>
    </div>
  )
}
