export type PharmacyLocation = {
  pharmacy_id: number
  name: string
  address: string
  price: number
}

export type SearchResultBase = {
  drug_id: string
  trade_name: string
  therapeutic_group?: string
  form?: string
  avg_price?: number
  active_ingredient?: string
  type?: 'medication' | 'cosmetic'
  description?: string
  alternatives?: Array<{ trade_name: string, avg_price: number }>
  available_locations?: PharmacyLocation[]
}

export type CartItem = {
  drug_id: string
  trade_name: string
  active_ingredient: string
  avg_price?: number
  available_locations?: PharmacyLocation[]
  qty?: number
}

export type ChatMessage = {
  sender: 'user' | 'bot'
  text: string
}

export type PatientContext = {
  age?: number
  sex?: 'male' | 'female' | 'other'
  weightKg?: number
  allergies: string[]
  conditions: string[]
  currentMeds: string[]
}
