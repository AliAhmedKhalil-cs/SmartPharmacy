import type { VercelRequest, VercelResponse } from '@vercel/node'

export type PatientContext = {
  age?: number
  sex?: 'male' | 'female' | 'other'
  weightKg?: number
  allergies?: string[]
  conditions?: string[]
  currentMeds?: string[]
}

// ============= CORS Helpers =============
export function enableCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
}

export function handleCors(req: VercelRequest, res: VercelResponse): boolean {
  enableCors(res)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return true
  }
  return false
}

// ============= Response Helpers =============
export function sendJson(res: VercelResponse, status: number, data: any) {
  enableCors(res)
  res.status(status).json(data)
}

export function sendOk(res: VercelResponse, data: any) {
  sendJson(res, 200, data)
}

export function sendError(res: VercelResponse, status: number, code: string, message: string, detail?: any) {
  sendJson(res, status, { error: { code, message, detail } })
}

// ============= Request Helpers =============
export async function readJsonBody(req: VercelRequest): Promise<any> {
  if (req.body) return req.body
  
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  if (!chunks.length) return {}
  const raw = Buffer.concat(chunks).toString('utf8')
  try { 
    return JSON.parse(raw) 
  } catch { 
    return {} 
  }
}

// ============= Validation Helpers =============
export function norm(s: string) {
  return String(s || '').toLowerCase().trim()
}

export function safeInt(v: any, min?: number, max?: number): number | undefined {
  const n = typeof v === 'number' ? v : Number(String(v || '').trim())
  if (!Number.isFinite(n)) return undefined
  const i = Math.trunc(n)
  if (min !== undefined && i < min) return undefined
  if (max !== undefined && i > max) return undefined
  return i
}

export function safeNum(v: any, min?: number, max?: number): number | undefined {
  const n = typeof v === 'number' ? v : Number(String(v || '').trim())
  if (!Number.isFinite(n)) return undefined
  if (min !== undefined && n < min) return undefined
  if (max !== undefined && n > max) return undefined
  return n
}

export function safeStr(v: any, maxLen: number): string | undefined {
  const s = String(v || '').trim()
  if (!s) return undefined
  if (s.length > maxLen) return undefined
  return s
}

export function safeStrList(v: any, maxItems: number, maxLen: number): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: string[] = []
  for (const x of v) {
    const s = safeStr(x, maxLen)
    if (s) out.push(s)
    if (out.length >= maxItems) break
  }
  return out
}

export function parsePatientContext(input: any): PatientContext {
  const ctx: PatientContext = {}
  const age = safeInt(input?.age, 0, 120)
  const weightKg = safeNum(input?.weightKg, 1, 400)
  const sex = input?.sex === 'male' || input?.sex === 'female' || input?.sex === 'other' ? input.sex : undefined
  const allergies = safeStrList(input?.allergies, 40, 60)
  const conditions = safeStrList(input?.conditions, 40, 60)
  const currentMeds = safeStrList(input?.currentMeds, 40, 120)
  if (age !== undefined) ctx.age = age
  if (weightKg !== undefined) ctx.weightKg = weightKg
  if (sex) ctx.sex = sex
  if (allergies) ctx.allergies = allergies
  if (conditions) ctx.conditions = conditions
  if (currentMeds) ctx.currentMeds = currentMeds
  return ctx
}

export function randomOrderCode() {
  const a = Math.random().toString(36).slice(2, 6).toUpperCase()
  const b = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `SP-${a}-${b}`
}

// ============= CSV Drug Loading =============
export type CsvDrug = {
  drug_id: string
  trade_name: string
  active_ingredient: string
  therapeutic_group?: string
  avg_price?: number
  form?: string
}

function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { quoted = !quoted; continue }
    if (ch === ',' && !quoted) { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out.map(x => x.trim())
}

let cachedDrugs: CsvDrug[] | null = null

export async function loadDrugs(): Promise<CsvDrug[]> {
  if (cachedDrugs) return cachedDrugs
  
  try {
    const fs = await import('fs/promises')
    const path = await import('path')
    const p1 = path.join(process.cwd(), 'data', 'drugs_eg.csv')
    const p2 = path.join(process.cwd(), 'data', 'drugs_import.csv')
    const filePath = await fs.access(p1).then(() => p1).catch(() => p2)
    const raw = await fs.readFile(filePath, 'utf8')
    const lines = raw.split(/\r?\n/).filter(Boolean)
    const header = splitCsvLine(lines[0]).map(norm)
    const idx = (name: string) => header.indexOf(norm(name))
    const iTrade = idx('trade_name')
    const iActive = idx('active_ingredient')
    const iGroup = idx('therapeutic_group')
    const iPrice = idx('avg_price')
    const iForm = idx('form')
    const drugs: CsvDrug[] = []
    
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i])
      const trade = cols[iTrade] || ''
      const active = cols[iActive] || ''
      if (!trade || !active) continue
      const avg = Number(cols[iPrice] || '')
      drugs.push({
        drug_id: String(i),
        trade_name: trade,
        active_ingredient: active,
        therapeutic_group: cols[iGroup] || '',
        avg_price: Number.isFinite(avg) ? avg : undefined,
        form: cols[iForm] || ''
      })
      if (drugs.length >= 15000) break
    }
    cachedDrugs = drugs
    return drugs
  } catch (error) {
    console.error('Failed to load drugs:', error)
    return []
  }
}

// ============= Search Function =============
export async function searchDrugs(query: string): Promise<CsvDrug[]> {
  const drugs = await loadDrugs()
  const q = norm(query)
  if (!q) return []
  
  return drugs.filter(drug => 
    norm(drug.trade_name).includes(q) || 
    norm(drug.active_ingredient).includes(q)
  ).slice(0, 50)
}
