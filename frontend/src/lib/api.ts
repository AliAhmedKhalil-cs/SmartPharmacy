import type { PatientContext, SearchResultBase } from '../types'

// Determine environment
const isDevelopment = import.meta.env.DEV
const isProduction = import.meta.env.PROD

// In development, use localhost FIRST
const DEFAULT_API_BASE = isDevelopment 
  ? '/api'  // Proxy to localhost:3001
  : '/api'  // Same domain in production

const FALLBACK_BASES: string[] = isDevelopment 
  ? [
      'http://127.0.0.1:3001/api',  // ← غيّر من 3000 إلى 3001
      'http://localhost:3001/api',
      'http://127.0.0.1:3000/api',
      'http://localhost:3000/api'
    ]
  : [
      'https://smart-pharmacy-fgng.vercel.app/api'
    ]

const env = import.meta.env || {}

function isAbsolute(url: string) {
  return /^https?:\/\//i.test(url)
}

let runtimeBase: string | null = null

export const API_BASE_URL: string = (() => {
  const envBase = String(env.VITE_API_BASE_URL || env.VITE_API_BASE || '').trim()
  
  if (envBase) {
    if (isAbsolute(envBase)) {
      return envBase.replace(/\/+$/, '').replace(/\/api$/, '') + '/api'
    }
    if (envBase.startsWith('/')) {
      return envBase.replace(/\/+$/, '')
    }
  }
  
  return DEFAULT_API_BASE
})()

function candidates() {
  const base = runtimeBase || API_BASE_URL
  
  // In development, prefer localhost
  if (isDevelopment) {
    return [base, ...FALLBACK_BASES].filter(Boolean)
  }
  
  // In production, prefer relative path
  const list = ['/api', ...FALLBACK_BASES].filter(Boolean)
  return Array.from(new Set(list))
}

async function readJson(res: Response) {
  const text = await res.text()
  try {
    const data = JSON.parse(text)
    if (!res.ok) {
      throw new Error(data?.error?.message || data?.message || `Request failed (${res.status})`)
    }
    return data
  } catch (e) {
    if (!res.ok) {
      throw new Error(`Request failed (${res.status}): ${text.substring(0, 100)}`)
    }
    throw e
  }
}

async function fetchWithFallback(path: string, init?: RequestInit) {
  let lastErr: any = null
  const candidateList = candidates()
  
  console.log(`[API] Environment: ${isDevelopment ? 'DEVELOPMENT' : 'PRODUCTION'}`)
  console.log(`[API] Attempting request to: ${path}`)
  console.log(`[API] Candidates:`, candidateList)
  
  for (const base of candidateList) {
    try {
      const fullUrl = `${base}${path}`
      console.log(`[API] Trying: ${fullUrl}`)
      
      const res = await fetch(fullUrl, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...init?.headers
        }
      })
      
      console.log(`[API] Response from ${fullUrl}: ${res.status}`)
      
      if (res.ok) {
        runtimeBase = base
        console.log(`[API] ✅ Success! Using base: ${base}`)
        return res
      }
      
      if (res.status === 404 || res.status === 0) {
        lastErr = new Error(`Not found (${res.status})`)
        continue
      }
      
      runtimeBase = base
      return res
    } catch (e: any) {
      console.warn(`[API] ❌ Failed for ${base}: ${e.message}`)
      lastErr = e
      continue
    }
  }
  
  console.error('[API] All candidates failed')
  throw lastErr || new Error('Network error: Unable to connect to API')
}

export async function apiSearch(q: string): Promise<SearchResultBase[]> {
  const res = await fetchWithFallback(`/search?q=${encodeURIComponent(q)}`)
  const data = await readJson(res)
  return Array.isArray(data) ? data : []
}

export async function apiChat(message: string, context?: PatientContext): Promise<string> {
  const res = await fetchWithFallback('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, context })
  })
  const data = await readJson(res)
  return String(data.reply || data.response || '')
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
  const data = await readJson(res)
  return Array.isArray(data) ? data : []
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
export type ReserveResponse = { 
  ok: boolean
  order_code: string
  pharmacy_id: number
  items: Array<{ 
    trade_name: string
    qty: number
    unit_price: number | null
    available: boolean 
  }>
  total: number 
}

export async function apiPharmacies(): Promise<any[]> {
  const res = await fetchWithFallback('/pharmacies')
  const data = await readJson(res)
  return Array.isArray(data.pharmacies) ? data.pharmacies : (Array.isArray(data) ? data : [])
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

export async function apiHealthCheck(): Promise<boolean> {
  try {
    const res = await fetchWithFallback('/health')
    return res.ok
  } catch {
    return false
  }
}
