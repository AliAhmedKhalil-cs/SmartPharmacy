const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err?.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

export interface PatientProfile {
  age?: number
  sex?: 'male' | 'female' | 'other'
  weightKg?: number
  allergies: string[]
  conditions: string[]
  currentMeds: string[]
}

export interface SearchResult {
  drug_id: string | number
  trade_name: string
  active_ingredient?: string
  therapeutic_group?: string
  form?: string
  avg_price?: number
  type: 'medication' | 'cosmetic'
  description?: string
  alternatives: { trade_name: string; avg_price?: number }[]
  available_locations: { pharmacy_id: number; name: string; address: string; price: number }[]
}

export interface RxFlag {
  level: 'info' | 'warn' | 'danger'
  code: string
  title: string
  message: string
  related?: string[]
}

export interface Pharmacy {
  id: number
  name: string
  address?: string
  phone?: string
  gps_lat?: number
  gps_lng?: number
}

export interface CartItem {
  trade_name: string
  qty: number
}

export interface OrderResult {
  ok: boolean
  order_code: string
  pharmacy_id: number
  items: { trade_name: string; qty: number; unit_price?: number; available: boolean }[]
  total: number
}

export const api = {
  search: (q: string) => request<SearchResult[]>(`/search?q=${encodeURIComponent(q)}`),

  chat: (message: string, context?: PatientProfile) =>
    request<{ reply: string; provider: string }>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, context }),
    }),

  ocr: (image_base64: string, mime = 'image/jpeg') =>
    request<string[]>('/ocr', {
      method: 'POST',
      body: JSON.stringify({ image_base64, mime }),
    }),

  validatePrescription: (meds: string[], context?: PatientProfile) =>
    request<{
      items: unknown[]
      flags: RxFlag[]
      interactions: unknown[]
      allergy: { hits: unknown[] }
      alternatives: Record<string, unknown[]>
    }>('/prescription/validate', {
      method: 'POST',
      body: JSON.stringify({ meds, context }),
    }),

  pharmacies: () => request<{ pharmacies: Pharmacy[] }>('/pharmacies'),

  reserve: (pharmacy_id: number, items: CartItem[], context?: PatientProfile) =>
    request<OrderResult>('/orders/reserve', {
      method: 'POST',
      body: JSON.stringify({ pharmacy_id, items, context }),
    }),

  forecast: (trade_name: string, days = 30) =>
    request<{ trade_name: string; days: number; points: { date: string; expected_demand: number }[] }>(
      `/inventory/forecast?trade_name=${encodeURIComponent(trade_name)}&days=${days}`
    ),

  checkInteractions: (items: { trade_name: string; active_ingredient: string }[]) =>
    request<{ hits: { a: unknown; b: unknown; severity: string; summary: string }[] }>('/interactions/check', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),
}
