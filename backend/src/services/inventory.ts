import { z } from 'zod'
import { getDb } from '../db/sqlite.js'

export const forecastQuerySchema = z.object({
  trade_name: z.string().min(1).max(120),
  days: z.coerce.number().int().min(7).max(90).default(30)
})

export type ForecastPoint = { date: string, expected_demand: number }

function iso(d: Date): string { return d.toISOString().slice(0, 10) }

export async function forecastDemand(tradeName: string, days: number): Promise<ForecastPoint[]> {
  const db = await getDb()
  const rows = await db.all<{ sold_date: string, qty: number }[]>(
    `SELECT sold_date, SUM(qty) as qty
     FROM sales_daily
     WHERE drug_trade_name LIKE ?
     GROUP BY sold_date
     ORDER BY sold_date DESC
     LIMIT 120`,
    [`%${tradeName}%`]
  )
  const avg = averageDaily(rows.map(r => Number(r.qty || 0)))
  const today = new Date()
  const out: ForecastPoint[] = []
  for (let i = 1; i <= days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    const seasonal = seasonMultiplier(d.getMonth() + 1)
    out.push({ date: iso(d), expected_demand: round1(avg * seasonal) })
  }
  return out
}

function averageDaily(values: number[]): number {
  const v = values.filter(x => Number.isFinite(x) && x >= 0)
  if (v.length === 0) return 3
  const sum = v.reduce((a, b) => a + b, 0)
  return sum / v.length
}

function seasonMultiplier(month: number): number {
  if ([12, 1, 2].includes(month)) return 1.25
  if ([6, 7, 8].includes(month)) return 1.05
  return 1
}

function round1(n: number): number { return Math.round(n * 10) / 10 }
