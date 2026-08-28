import { Link } from 'wouter'
import { Search, MessageCircle, Camera, ShieldCheck, TrendingUp, Star, ChevronLeft } from 'lucide-react'

const features = [
  { icon: Search, title: 'بحث ذكي', desc: 'دواء أو مستحضر تجميل بالعربي أو الإنجليزي', path: '/search', color: 'bg-emerald-50 text-emerald-600' },
  { icon: MessageCircle, title: 'مساعد ذكي', desc: 'اسأل صيدلاني رقمي بالعربي المصري', path: '/chat', color: 'bg-sky-50 text-sky-600' },
  { icon: Camera, title: 'اقرأ الروشتة', desc: 'صوّر روشتتك وهنفكك الأدوية فورًا', path: '/ocr', color: 'bg-amber-50 text-amber-600' },
  { icon: ShieldCheck, title: 'فحص التداخلات', desc: 'تأكد إن الأدوية مش بتتعارض مع بعض', path: '/search', color: 'bg-rose-50 text-rose-600' },
]

const tips = [
  'خلّي معاك النسخة الرقمية من روشتتك دايمًا',
  'ما تبدلش جرعة الدواء من غير ما تستشير صيدلي',
  'الأدوية الجنيسة نفس التأثير بسعر أقل',
  'تخزين الأدوية في مكان جاف وبعيد عن الشمس مهم',
]

export function HomePage() {
  return (
    <div className="min-h-dvh">
      <div className="hero-bg px-5 pt-12 pb-10 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-lg">💊</span>
            </div>
            <span className="text-white/80 text-sm font-semibold">SmartPharmacy</span>
          </div>
          <h1 className="text-3xl font-black mt-4 leading-tight">
            صيدليتك الذكية
            <br />
            <span className="text-emerald-300">في إيدك</span>
          </h1>
          <p className="text-white/75 mt-2 text-sm leading-relaxed">
            بحث أدوية، روشتات، تداخلات، ومساعد ذكاء اصطناعي — كل ده بالعربي المصري
          </p>
          <div className="flex gap-2 mt-5">
            <Link href="/search">
              <button className="sp-btn bg-white text-emerald-700 hover:bg-emerald-50 font-bold px-5 py-2.5 rounded-xl text-sm shadow-lg">
                ابحث دلوقتي
              </button>
            </Link>
            <Link href="/profile">
              <button className="sp-btn border border-white/30 text-white hover:bg-white/10 font-bold px-5 py-2.5 rounded-xl text-sm">
                ملفي الصحي
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        <div>
          <div className="section-title">
            <Star size={18} className="text-amber-500" />
            خدماتنا
          </div>
          <div className="grid grid-cols-2 gap-3">
            {features.map(f => (
              <Link key={f.path + f.title} href={f.path}>
                <div className="sp-card p-4 h-full cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                    <f.icon size={20} />
                  </div>
                  <h3 className="font-bold text-sm text-gray-800 mb-1">{f.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <div className="section-title">
            <TrendingUp size={18} className="text-green-600" />
            نصائح صحية
          </div>
          <div className="space-y-2">
            {tips.map((tip, i) => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-xl p-3.5 border border-green-50 shadow-sm">
                <div className="w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-5 text-white">
          <h3 className="font-bold text-base mb-1">حجز في الصيدلية أسرع</h3>
          <p className="text-white/80 text-sm mb-4">أضف الأدوية للسلة واحجز في أقرب صيدلية</p>
          <Link href="/pharmacies">
            <button className="flex items-center gap-1.5 bg-white text-emerald-700 font-bold text-sm px-4 py-2 rounded-xl hover:bg-emerald-50 transition-colors">
              اعرف الصيدليات
              <ChevronLeft size={14} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
