export function buildWhatsAppMessage(userName: string, tradeName?: string, activeIngredient?: string) {
  const tn = tradeName ?? '';
  const ai = activeIngredient ?? '';
  return `مرحباً، أنا ${userName} عبر ${process.env.APP_NAME || 'SmartPharmacy'}.
أستفسر عن توفر: ${tn}${ai ? ` (${ai})` : ''}.
لو غير متوفر، رجاء اقتراح بديل بنفس المادة الفعالة.
فضلاً الرد بالتوفر والسعر. شكراً.`;
}