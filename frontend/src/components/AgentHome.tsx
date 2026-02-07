import type { PatientContext } from '../types'

type Props = {
  patient: PatientContext
  onGoSearch: () => void
  onGoPrescription: () => void
  onGoAllergy: () => void
  onOpenProfile: () => void
}

function summary(patient: PatientContext) {
  const a = patient.allergies?.length || 0
  const c = patient.conditions?.length || 0
  const m = patient.currentMeds?.length || 0
  const bits = [
    patient.age ? `سن ${patient.age}` : '',
    a ? `حساسية ${a}` : '',
    c ? `حالات ${c}` : '',
    m ? `أدوية ${m}` : ''
  ].filter(Boolean)
  return bits.length ? bits.join(' • ') : 'ابدأ بإعداد ملفك عشان النتائج تبقى أدق'
}

export function AgentHome({ patient, onGoSearch, onGoPrescription, onGoAllergy, onOpenProfile }: Props) {
  return (
    <section className="sp-agent" aria-label="Agent Home">
      <div className="sp-agent__hero">
        <div className="sp-agent__headline">إنت خارج من الكشف؟ خلّينا نرتّبها 👇</div>
        <div className="sp-agent__sub">{summary(patient)}</div>
        <div className="sp-agent__cta">
          <button className="sp-btn primary" onClick={onGoPrescription} type="button">📷 صوّر الروشتة</button>
          <button className="sp-btn secondary" onClick={onGoSearch} type="button">🔎 ابحث باسم الدواء</button>
        </div>
      </div>

      <div className="sp-agent__grid">
        <button className="sp-agentcard" onClick={onGoPrescription} type="button">
          <div className="sp-agentcard__icon">🧾</div>
          <div className="sp-agentcard__title">فهم الروشتة</div>
          <div className="sp-agentcard__desc">نطلع الأدوية، نعمل تحذيرات، ونقترح بدائل</div>
        </button>

        <button className="sp-agentcard" onClick={onGoSearch} type="button">
          <div className="sp-agentcard__icon">💊</div>
          <div className="sp-agentcard__title">سعر + مادة فعالة</div>
          <div className="sp-agentcard__desc">ابحث بسرعة وشوف التوفر والبدائل</div>
        </button>

        <button className="sp-agentcard" onClick={onGoAllergy} type="button">
          <div className="sp-agentcard__icon">⚠️</div>
          <div className="sp-agentcard__title">حساسية</div>
          <div className="sp-agentcard__desc">حط حساسية وهنحذّرك تلقائي في كل نتيجة</div>
        </button>

        <button className="sp-agentcard" onClick={onOpenProfile} type="button">
          <div className="sp-agentcard__icon">👤</div>
          <div className="sp-agentcard__title">ملفي الطبي</div>
          <div className="sp-agentcard__desc">سن/حالات/أدوية حالية لتجربة شخصية</div>
        </button>
      </div>
    </section>
  )
}
