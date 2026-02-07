const arabicDiacritics = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g;

export function normalizeArabic(input: string): string {
  return input
    .toLowerCase()
    .replace(arabicDiacritics, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^a-z0-9\u0621-\u063A\u064F-\u0652\u064F-\u0652\u064F-\u0652\u0641-\u064A\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function levenshtein(a: string, b: string): number {
  const m = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i][0] = i;
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + cost);
    }
  }
  return m[a.length][b.length];
}

export function fuzzyScore(a: string, b: string): number {
  const na = normalizeArabic(a);
  const nb = normalizeArabic(b);
  const d = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - d / Math.max(1, maxLen);
}