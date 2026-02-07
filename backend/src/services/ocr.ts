import Tesseract from 'tesseract.js';
import { normalizeArabic } from '../lib/textMatch.js';

export async function ocrExtractDrugs(buffer: Buffer) {
  const { data } = await Tesseract.recognize(buffer, process.env.OCR_LANG || 'ara+eng', { logger: () => {} });
  const text = normalizeArabic(data.text);
  const tokens = text.split(/\s+/).filter(Boolean);
  const uniq = new Map<string, number>();
  for (const w of tokens) {
    const key = w.trim();
    if (key.length >= 3) uniq.set(key, Math.max(uniq.get(key) || 0, 0.5));
  }
  return Array.from(uniq.entries()).map(([drug_name, confidence]) => ({ drug_name, confidence }));
}