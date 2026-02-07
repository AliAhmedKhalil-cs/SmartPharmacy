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

      <div className="sp-journey" aria-label="User Journey">
        <div className="sp-journey__left">
          <div className="sp-journey__title">رحلتك في 3 خطوات</div>
          <div className="sp-journey__desc">من أول صورة للروشتة لحد حجز الدوا من صيدلية قريبة… كله بسلاسة.</div>
          <div className="sp-journey__actions">
            <button className="sp-btn" onClick={onGoPrescription} type="button">ابدأ بالروشتة</button>
            <button className="sp-btn ghost" onClick={onOpenProfile} type="button">ظبط الملف الطبي</button>
          </div>
        </div>

        <div className="sp-journey__steps">
          <div className="sp-jourstep">
            <div className="sp-jourstep__num">1</div>
            <div className="sp-jourstep__body">
              <div className="sp-jourstep__title">رفع الروشتة / بحث</div>
              <div className="sp-jourstep__text">صوّر الروشتة أو اكتب اسم الدواء</div>
            </div>
          </div>
          <div className="sp-jourstep">
            <div className="sp-jourstep__num">2</div>
            <div className="sp-jourstep__body">
              <div className="sp-jourstep__title">تحليل ذكي</div>
              <div className="sp-jourstep__text">تحذيرات حساسية + تفاعلات + بدائل</div>
            </div>
          </div>
          <div className="sp-jourstep">
            <div className="sp-jourstep__num">3</div>
            <div className="sp-jourstep__body">
              <div className="sp-jourstep__title">سلة وحجز</div>
              <div className="sp-jourstep__text">ضيف للسلة واحجز من صيدلية مناسبة</div>
            </div>
          </div>
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
