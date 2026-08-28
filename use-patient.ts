import { useState, useCallback } from 'react'
import type { PatientProfile } from '../lib/api'

const STORAGE_KEY = 'sp_patient_profile'

function loadProfile(): PatientProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { allergies: [], conditions: [], currentMeds: [] }
}

function saveProfile(p: PatientProfile) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) } catch {}
}

export function usePatient() {
  const [profile, setProfileState] = useState<PatientProfile>(loadProfile)

  const setProfile = useCallback((updates: Partial<PatientProfile>) => {
    setProfileState(prev => {
      const next = { ...prev, ...updates }
      saveProfile(next)
      return next
    })
  }, [])

  const hasProfile = !!(profile.age || profile.sex || profile.allergies.length || profile.conditions.length)

  return { profile, setProfile, hasProfile }
}

const CART_KEY = 'sp_cart'

export interface CartItem {
  trade_name: string
  qty: number
}

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

function saveCart(cart: CartItem[]) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(cart)) } catch {}
}

export function useCart() {
  const [cart, setCartState] = useState<CartItem[]>(loadCart)

  const addItem = useCallback((trade_name: string) => {
    setCartState(prev => {
      const existing = prev.find(x => x.trade_name === trade_name)
      const next = existing
        ? prev.map(x => x.trade_name === trade_name ? { ...x, qty: x.qty + 1 } : x)
        : [...prev, { trade_name, qty: 1 }]
      saveCart(next)
      return next
    })
  }, [])

  const removeItem = useCallback((trade_name: string) => {
    setCartState(prev => {
      const next = prev.filter(x => x.trade_name !== trade_name)
      saveCart(next)
      return next
    })
  }, [])

  const updateQty = useCallback((trade_name: string, qty: number) => {
    setCartState(prev => {
      const next = qty <= 0
        ? prev.filter(x => x.trade_name !== trade_name)
        : prev.map(x => x.trade_name === trade_name ? { ...x, qty } : x)
      saveCart(next)
      return next
    })
  }, [])

  const clearCart = useCallback(() => {
    setCartState([])
    saveCart([])
  }, [])

  const totalItems = cart.reduce((s, x) => s + x.qty, 0)

  return { cart, addItem, removeItem, updateQty, clearCart, totalItems }
}
