import { useState } from 'react'
import { User, Save, Plus, X, CheckCircle, Heart, Pill, AlertTriangle } from 'lucide-react'
import { usePatient } from '../hooks/use-patient'

export function ProfilePage() {
  const { profile, setProfile, hasProfile } = usePatient()
  const [saved, setSaved] = useState(false)

  const [age, setAge] = useState(profile.age?.toString() ?? '')
  const [sex, setSex] = useState<'male' | 'female' | 'other' | ''>(profile.sex ?? '')
  const [weight, setWeight] = useState(profile.weightKg?.toString() ?? '')
  const [allergyInput, setAllergyInput] = useState('')
  const [condInput, setCondInput] = useState('')
  const [medInput, setMedInput] = useState('')

  const addToList = (key: 'allergies' | 'conditions' | 'currentMeds', value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return
    const list = profile[key]
    if (!list.includes(trimmed)) {
      setProfile({ [key]: [...list, trimmed] })
    }
  }

  const removeFromList = (key: 'allergies' | 'conditions' | 'currentMeds', val: string) => {
    setProfile({ [key]: profile[key].filter(x => x !== val) })
  }

  const handleSave = () => {
    setProfile({
      age: age ? parseInt(age, 10) : undefined,
      sex: (sex as 'male' | 'female' | 'other') || undefined,
      weightKg: weight ? parseFloat(weight) : undefined,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const TagList = ({ items, onRemove }: { items: string[]; onRemove: (v: string) => void }) => (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <div key={item} className="flex items-center gap-1 bg-green-100 text-green-800 rounded-lg px-2.5 py-1">
          <span className="text-xs font-semibold">{item}</span>
          <button onClick={() => onRemove(item)} className="text-green-600 hover:text-red-500 transition-colors">
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-dvh">
      <div className="hero-bg px-4 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <User size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl">ملفك الصحي</h1>
            <p className="text-white/70 text-xs">بياناتك بتساعد المساعد الذكي يديك نصايح أدق</p>
          </div>
        </div>
        {hasProfile && (
          <div className="mt-3 bg-white/15 rounded-xl px-3 py-2 flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-300" />
            <span className="text-white/90 text-xs font-semibold">ملفك مكتمل ومفعّل للمساعد الذكي</span>
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-5">
        <div className="sp-card p-5">
          <div className="section-title">
            <User size={17} className="text-green-600" />
            المعلومات الأساسية
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">العمر</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="مثال: 30"
                min={1}
                max={120}
                className="sp-input !py-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">الجنس</label>
              <div className="flex gap-2">
                {[{ v: 'male', label: 'ذكر' }, { v: 'female', label: 'أنثى' }, { v: 'other', label: 'غير محدد' }].map(opt => (
                  <button
                    key={opt.v}
                    onClick={() => setSex(opt.v as 'male' | 'female' | 'other')}
                    className={`sp-btn flex-1 ${sex === opt.v ? 'sp-btn-primary' : 'sp-btn-secondary'} !py-2.5 text-sm`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-2">الوزن (كجم)</label>
              <input
                type="number"
                value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="مثال: 75"
                min={1}
                max={400}
                className="sp-input !py-2.5"
              />
            </div>
          </div>
        </div>

        <div className="sp-card p-5">
          <div className="section-title">
            <AlertTriangle size={17} className="text-amber-500" />
            الحساسية
          </div>
          <p className="text-xs text-gray-500 mb-3 -mt-1">اكتب اسم المادة أو الدواء اللي عندك منه حساسية</p>
          <TagList items={profile.allergies} onRemove={v => removeFromList('allergies', v)} />
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={allergyInput}
              onChange={e => setAllergyInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { addToList('allergies', allergyInput); setAllergyInput('') } }}
              placeholder="مثال: بنسلين"
              className="sp-input flex-1 !py-2"
            />
            <button
              onClick={() => { addToList('allergies', allergyInput); setAllergyInput('') }}
              className="sp-btn sp-btn-secondary sp-btn-sm"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="sp-card p-5">
          <div className="section-title">
            <Heart size={17} className="text-rose-500" />
            الحالات الصحية
          </div>
          <TagList items={profile.conditions} onRemove={v => removeFromList('conditions', v)} />
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={condInput}
              onChange={e => setCondInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { addToList('conditions', condInput); setCondInput('') } }}
              placeholder="مثال: ضغط عالي"
              className="sp-input flex-1 !py-2"
            />
            <button
              onClick={() => { addToList('conditions', condInput); setCondInput('') }}
              className="sp-btn sp-btn-secondary sp-btn-sm"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <div className="sp-card p-5">
          <div className="section-title">
            <Pill size={17} className="text-blue-500" />
            الأدوية الحالية
          </div>
          <TagList items={profile.currentMeds} onRemove={v => removeFromList('currentMeds', v)} />
          <div className="flex gap-2 mt-3">
            <input
              type="text"
              value={medInput}
              onChange={e => setMedInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { addToList('currentMeds', medInput); setMedInput('') } }}
              placeholder="مثال: ميتفورمين"
              className="sp-input flex-1 !py-2"
            />
            <button
              onClick={() => { addToList('currentMeds', medInput); setMedInput('') }}
              className="sp-btn sp-btn-secondary sp-btn-sm"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="sp-btn sp-btn-primary w-full py-3.5 text-base"
        >
          {saved ? <><CheckCircle size={18} /> تم الحفظ!</> : <><Save size={18} /> حفظ الملف الصحي</>}
        </button>

        <p className="text-center text-xs text-gray-400 pb-2">
          بياناتك محفوظة محليًا على جهازك فقط ولا تُرسل لأي جهة
        </p>
      </div>
    </div>
  )
}
