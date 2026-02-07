import type { PatientContext, SearchResultBase } from '../types'

const DEFAULT_API_BASE = '/api'
const FALLBACK_BASES: string[] = []

const env = (import.meta as any).env || {}

function isAbsolute(url: string) {
  return /^https?:\/\//i.test(url)
}

let runtimeBase: string | null = null

export const API_BASE_URL: string = (() => {
  const v = String(env.VITE_API_BASE_URL || env.VITE_API_BASE || '').trim()
  if (!v) return DEFAULT_API_BASE
  if (v.startsWith('/')) return DEFAULT_API_BASE
  return v
})()

function candidates() {
  const base = runtimeBase || API_BASE_URL
  const list = [base, ...FALLBACK_BASES].filter(Boolean)
  return Array.from(new Set(list))
}

async function readJson(res: Response) {
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status})`)
  return data
}

async function fetchWithFallback(path: string, init?: RequestInit) {
  let lastErr: any = null
  for (const base of candidates()) {
    try {
      const res = await fetch(`${base}${path}`, init)
      runtimeBase = base
      return res
    } catch (e) {
      lastErr = e
      continue
    }
  }
  throw lastErr || new Error('Network error')
}

export async function apiSearch(q: string): Promise<SearchResultBase[]> {
  const res = await fetchWithFallback(`/search?q=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error(`Search failed (${res.status})`)
  return await res.json()
}

export async function apiChat(message: string, context?: PatientContext): Promise<string> {
  const res = await fetchWithFallback('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context })
  })
  const data = await readJson(res)
  return String(data.reply || '')
}

export async function apiOcr(image: File): Promise<string[]> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const r = String(reader.result || '')
      const idx = r.indexOf(',')
      resolve(idx >= 0 ? r.slice(idx + 1) : r)
    }
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.readAsDataURL(image)
  })

  const res = await fetchWithFallback('/ocr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64, mime: image.type || 'image/jpeg' })
  })
  if (!res.ok) throw new Error(`OCR failed (${res.status})`)
  return await res.json()
}

export type InteractionItem = { trade_name: string, active_ingredient: string }
export type InteractionHit = {
  a: InteractionItem
  b: InteractionItem
  severity: 'low' | 'medium' | 'high'
  summary: string
}

export async function apiInteractionsCheck(items: InteractionItem[]): Promise<InteractionHit[]> {
  const res = await fetchWithFallback('/interactions/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items })
  })
  const data = await readJson(res)
  return Array.isArray(data.hits) ? data.hits : []
}

export type PrescriptionValidationResult = {
  items: any[]
  flags: any[]
  interactions: any[]
  allergy: any
  alternatives: Record<string, any[]>
}

export async function apiPrescriptionValidate(meds: string[], context?: PatientContext): Promise<PrescriptionValidationResult> {
  const res = await fetchWithFallback('/prescription/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meds, context })
  })
  return await readJson(res)
}


export type ReserveItem = { trade_name: string, qty?: number }
export type ReserveResponse = { ok: boolean, order_code: string, pharmacy_id: number, items: Array<{ trade_name: string, qty: number, unit_price: number | null, available: boolean }>, total: number }

export async function apiPharmacies(): Promise<any[]> {
  const res = await fetchWithFallback('/pharmacies')
  const data = await readJson(res)
  return Array.isArray(data.pharmacies) ? data.pharmacies : []
}

export async function apiReserveOrder(pharmacy_id: number, items: ReserveItem[], context?: PatientContext): Promise<ReserveResponse> {
  const res = await fetchWithFallback('/orders/reserve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pharmacy_id, items, context })
  })
  const data = await readJson(res)
  return data as ReserveResponse
}
