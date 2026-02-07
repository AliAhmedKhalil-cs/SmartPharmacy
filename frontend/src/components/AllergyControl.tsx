import { useEffect, useMemo, useState } from 'react'

type Props = {
  allergens: string[]
  onChange: (vals: string[]) => void
}

function clean(input: string): string[] {
  return input
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 30)
}

export function AllergyControl({ allergens, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(allergens.join(', '))

  useEffect(() => { setDraft(allergens.join(', ')) }, [allergens])

  const label = useMemo(() => {
    if (allergens.length === 0) return '🛡️ حساسية: غير محددة'
    if (allergens.length === 1) return `🛡️ حساسية: ${allergens[0]}`
    return `🛡️ حساسية: ${allergens[0]} +${allergens.length - 1}`
  }, [allergens])

  function save() {
    onChange(clean(draft))
    setOpen(false)
  }

  return (
    <>
      <button className="sp-pill" onClick={() => setOpen(true)} type="button">{label}</button>

      {open && (
        <div className="sp-modal" role="dialog" aria-modal="true">
          <div className="sp-modal-card">
            <div className="sp-modal-title">إعداد الحساسية</div>
            <div className="sp-modal-sub">اكتب المواد اللي عندك حساسية منها (مفصولة بفواصل)</div>

            <textarea
              className="sp-textarea"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="مثال: paracetamol, ibuprofen"
              rows={3}
            />

            <div className="sp-chiprow" aria-label="Current allergens">
              {clean(draft).map((a) => <span key={a} className="sp-chip">{a}</span>)}
              {clean(draft).length === 0 && <span className="sp-muted">مفيش بيانات</span>}
            </div>

            <div className="sp-modal-actions">
              <button className="sp-btn ghost" onClick={() => setOpen(false)} type="button">إلغاء</button>
              <button className="sp-btn" onClick={save} type="button">حفظ</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
