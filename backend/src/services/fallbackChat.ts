import type { PatientContext } from './prescriptionValidator.js'

type Reply = { text: string, tags?: string[] }

function norm(s: string) { return String(s || '').toLowerCase().trim() }

function hasAny(s: string, keys: string[]) {
  const n = norm(s)
  return keys.some(k => n.includes(norm(k)))
}

function ctxLine(ctx: PatientContext | undefined) {
  if (!ctx) return ''
  const parts: string[] = []
  if (ctx.age) parts.push(`العمر: ${ctx.age}`)
  if (ctx.sex) parts.push(`النوع: ${ctx.sex}`)
  if (ctx.weightKg) parts.push(`الوزن: ${ctx.weightKg} كجم`)
  if (ctx.allergies?.length) parts.push(`حساسية: ${ctx.allergies.join('، ')}`)
  if (ctx.conditions?.length) parts.push(`حالات: ${ctx.conditions.join('، ')}`)
  if (ctx.currentMeds?.length) parts.push(`أدوية حالية: ${ctx.currentMeds.join('، ')}`)
  return parts.length ? `

ملفك الطبي: ${parts.join(' • ')}` : ''
}

export function fallbackChatAnswer(message: string, ctx?: PatientContext): Reply {
  const m = norm(message)

  if (hasAny(m, ['جرعة', 'dose', 'كم مل', 'كام قرص', 'كام حبة'])) {
    return {
      text: `مقدرش أحدد جرعة شخصية لك هنا. لو عندك اسم الدواء وتركيزه وسنك/وزنك، اقدر أشرح الجرعات الشائعة من النشرة مع تحذيرات مهمة — والأفضل تأكيدها مع صيدلي أو طبيب.${ctxLine(ctx)}`
    }
  }

  if (hasAny(m, ['قهوة', 'coffee', 'كافيين'])) {
    return {
      text: `بشكل عام: القهوة ممكن تزود تهيّج المعدة مع بعض المسكنات (زي الإيبوبروفين) وممكن تزود خفقان مع أدوية البرد اللي فيها مزيل احتقان. لو كتبت اسم الدواء/المادة الفعالة أقولك أدق.${ctxLine(ctx)}`
    }
  }

  if (hasAny(m, ['صيام', 'رمضان', 'افطر', 'سحور'])) {
    return {
      text: `في الصيام: بنقسّم الجرعات بين الإفطار والسحور حسب عدد المرات. بعض الأدوية لازم تتاخد مع أكل، وبعضها على معدة فاضية. اكتب اسم الدواء وعدد مرات الجرعة وهقولك تقسيم آمن بشكل عام.${ctxLine(ctx)}`
    }
  }

  if (hasAny(m, ['مضاد', 'antibiotic', 'مضاد حيوي', 'توقف', 'أوقف'])) {
    return {
      text: `المضاد الحيوي غالبًا لازم يتاخد للمدة اللي كتبها الطبيب حتى لو اتحسّنت، إلا لو ظهرت حساسية شديدة (طفح قوي/ضيق نفس/تورم) ساعتها توقف فورًا وتراجع طوارئ. لو قلت اسم المضاد اقدر أوضح نقاط التخزين والأكل والتداخلات.${ctxLine(ctx)}`
    }
  }

  if (hasAny(m, ['دوخة', 'دوار', 'غثيان', 'مغص', 'طفح', 'حساسية'])) {
    return {
      text: `الأعراض الجانبية بتختلف حسب الدواء. لو في ضيق نفس، تورم بالوجه/الشفايف، أو إغماء — دي طوارئ. غير كده: اكتب اسم الدواء وامتى بدأت الأعراض (بعد أول جرعة ولا بعد كام يوم) وأنا أساعدك تقيّمها بشكل آمن.${ctxLine(ctx)}`
    }
  }

  return {
    text: `قولّي اسم الدواء أو صور الروشتة وأنا أساعدك: بدائل، تحذيرات حساسية، وتداخلات محتملة. ${ctxLine(ctx)}`
  }
}
