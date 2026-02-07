import { query } from '../db.js'

type DrugRow = {
  drug_id: number | string
  trade_name: string
  active_ingredient: string
  therapeutic_group?: string
  avg_price?: number
  form?: string
}

export async function searchDrugs(q: string): Promise<DrugRow[]> {
  const cleanQuery = q.trim()
  if (!cleanQuery) return []
  const sql = `
    SELECT * FROM drugs
    WHERE trade_name LIKE ? OR active_ingredient LIKE ?
    ORDER BY trade_name ASC
    LIMIT 20
  `
  const params = [`%${cleanQuery}%`, `%${cleanQuery}%`]
  const rows = await query<any>(sql, params)
  return Array.isArray(rows) ? rows as DrugRow[] : []
}

export async function findAlternatives(activeIngredient: string, tradeName: string, avgPrice?: number): Promise<DrugRow[]> {
  const active = (activeIngredient || '').trim()
  if (!active) return []
  const price = Number.isFinite(avgPrice) ? Number(avgPrice) : null
  const sql = `
    SELECT * FROM drugs
    WHERE active_ingredient = ?
      AND trade_name <> ?
      AND (? IS NULL OR ABS(COALESCE(avg_price, 0) - ?) <= 15)
    ORDER BY ABS(COALESCE(avg_price, 0) - COALESCE(?, 0)) ASC
    LIMIT 6
  `
  const params = [active, tradeName, price, price, price]
  const rows = await query<any>(sql, params)
  return Array.isArray(rows) ? rows as DrugRow[] : []
}
