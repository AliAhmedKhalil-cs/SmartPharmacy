import { z } from 'zod'

export const allergyProfileSchema = z.object({
  allergens: z.array(z.string().min(1).max(80)).max(30)
})

export type AllergyProfile = z.infer<typeof allergyProfileSchema>

export type AllergyFlag = {
  hit: boolean
  level: 'none' | 'warn'
  matched: string[]
}

function normalize(s: string): string {
  return s.toLowerCase().trim()
}

export function checkAllergy(activeIngredient: string | null | undefined, profile: AllergyProfile): AllergyFlag {
  const active = normalize(activeIngredient ?? '')
  if (!active) return { hit: false, level: 'none', matched: [] }
  const allergens = profile.allergens.map(normalize).filter(Boolean)
  const matched = allergens.filter(a => active.includes(a) || a.includes(active))
  if (matched.length === 0) return { hit: false, level: 'none', matched: [] }
  return { hit: true, level: 'warn', matched }
}
