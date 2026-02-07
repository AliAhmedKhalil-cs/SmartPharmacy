import { z } from 'zod'
import { getDb } from '../db/sqlite.js'

export const interactionRequestSchema = z.object({
  items: z.array(z.object({
    trade_name: z.string().min(1).max(120),
    active_ingredient: z.string().min(1).max(160)
  })).min(2).max(12)
})

export type InteractionSeverity = 'low' | 'medium' | 'high'

export type InteractionHit = {
  a: { trade_name: string, active_ingredient: string }
  b: { trade_name: string, active_ingredient: string }
  severity: InteractionSeverity
  summary: string
}

function norm(s: string): string { return s.toLowerCase().trim() }

export async function checkInteractions(items: { trade_name: string, active_ingredient: string }[]): Promise<InteractionHit[]> {
  const db = await getDb()
  const hits: InteractionHit[] = []
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i]
      const b = items[j]
      const aAct = norm(a.active_ingredient)
      const bAct = norm(b.active_ingredient)
      const rule = await db.get<any>(
        `SELECT severity, summary FROM interaction_rules
         WHERE (lower(a_active)=? AND lower(b_active)=?) OR (lower(a_active)=? AND lower(b_active)=?)
         LIMIT 1`,
        [aAct, bAct, bAct, aAct]
      )
      if (rule) hits.push({ a, b, severity: String(rule.severity) as InteractionSeverity, summary: String(rule.summary) })
    }
  }
  hits.sort((x, y) => score(y.severity) - score(x.severity))
  return hits
}

function score(s: InteractionSeverity): number {
  if (s === 'high') return 3
  if (s === 'medium') return 2
  return 1
}
