import { useEffect, useMemo, useState } from 'react'
import './index.css'

import { Header } from './components/Header'
import { AgentHome } from './components/AgentHome'
import { SearchBar } from './components/SearchBar'
import { AllergyControl } from './components/AllergyControl'
import { ResultCard } from './components/ResultCard'
import { ChatWidget } from './components/ChatWidget'
import { CartDrawer } from './components/CartDrawer'
import { CheckoutPage } from './components/CheckoutPage'
import { PatientWizard } from './components/PatientWizard'
import { PrescriptionValidator } from './components/PrescriptionValidator'
import { apiChat, apiInteractionsCheck, apiOcr, apiSearch, apiReserveOrder } from './lib/api'
import { useLocalStorage } from './lib/useLocalStorage'
import type { CartItem, PatientContext, SearchResultBase } from './types'

function toCartItem(x: SearchResultBase): CartItem | null {
  const active = String(x.active_ingredient || '').trim()
  if (!active) return null
  return {
    drug_id: x.drug_id,
    trade_name: x.trade_name,
    active_ingredient: active,
    avg_price: x.avg_price,
    available_locations: Array.isArray(x.available_locations) ? x.available_locations : [],
    qty: 1
  }
}

export default function App() {
  const [view, setView] = useState<'home' | 'search' | 'prescription' | 'allergy' | 'checkout'>('home')
  const [returnView, setReturnView] = useState<'home' | 'search' | 'prescription' | 'allergy'>('home')
  const [checkoutPharmacyId, setCheckoutPharmacyId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResultBase[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [legacyAllergens] = useLocalStorage<string[]>('sp_allergens', [])
  const [patient, setPatient] = useLocalStorage<PatientContext>('sp_patient', { allergies: [], conditions: [], currentMeds: [] })
  const [profileDismissed, setProfileDismissed] = useLocalStorage<boolean>('sp_profile_dismissed', false)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [cart, setCart] = useLocalStorage<CartItem[]>('sp_cart', [])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const parse = () => {
      const raw = String(window.location.hash || '').replace(/^#\/?/, '')
      const key = raw.split('?')[0].replace(/^\//, '')
      if (!key || key === '') return 'home'
      if (key === 'search') return 'search'
      if (key === 'prescription') return 'prescription'
      if (key === 'allergy') return 'allergy'
      if (key === 'checkout') return 'checkout'
      return 'home'
    }

    const syncFromHash = () => {
      const next = parse()
      setView((cur) => (cur === next ? cur : next))
    }

    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  useEffect(() => {
    const next = view === 'home' ? '#/' : `#/${view}`
    if (window.location.hash !== next) window.location.hash = next
  }, [view])

  useEffect(() => {
    const hasAny = (patient.allergies?.length || 0) + (patient.conditions?.length || 0) + (patient.currentMeds?.length || 0)
    const looksNew = !patient.age && !patient.weightKg && (!patient.sex || patient.sex === 'other') && hasAny === 0
    if (!profileDismissed && looksNew && !wizardOpen) setWizardOpen(true)
  }, [patient, wizardOpen, profileDismissed])

  useEffect(() => {
    if (patient.allergies.length === 0 && legacyAllergens.length > 0) {
      setPatient({ ...patient, allergies: legacyAllergens })
    }
  }, [legacyAllergens, patient, setPatient])


  const allergens = patient.allergies

  const emptyState = useMemo(() => {
    if (loading) return ''
    if (error) return error
    if (!query && results.length === 0) return 'ابدأ بكتابة اسم دواء/تجميل… أو صوّر الروشتة 📷'
    if (query && results.length === 0) return 'مفيش نتائج… جرّب كتابة الاسم بشكل تاني.'
    return ''
  }, [loading, error, query, results.length])

  async function doSearch(val?: string) {
    go('search')
    const q = (val ?? query).trim()
    if (!q) return
    setError('')
    setLoading(true)
    try {
      const data = await apiSearch(q)
      setResults(Array.isArray(data) ? data : [])
    } catch {
      setError('في مشكلة اتصال بالسيرفر. تأكد إن الـ Backend شغال.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function doOcr(file: File) {
    go('search')
    setError('')
    setAnalyzing(true)
    try {
      const names = await apiOcr(file)
      const detected = Array.isArray(names) ? names[0] : ''
      if (!detected) {
        setError('الصورة مش واضحة… جرّب تاني بصورة أقرب/أوضح.')
        return
      }
      setQuery(detected)
      await doSearch(detected)
    } catch {
      setError('فشل تحليل الصورة. جرّب تاني.')
    } finally {
      setAnalyzing(false)
    }
  }


  async function addRxToCart(list: string[]) {
    setError('')
    setLoading(true)
    try {
      const next: CartItem[] = [...cart]
      for (const name of list.slice(0, 10)) {
        const res = await apiSearch(name)
        const pick = Array.isArray(res) ? res.find(x => x.type === 'medication' && x.active_ingredient) : null
        if (!pick) continue
        const it = toCartItem(pick)
        if (!it) continue
        const exists = next.some(x => x.drug_id === it.drug_id)
        if (!exists) next.push(it)
      }
      setCart(next.slice(0, 12))
      setDrawerOpen(true)
      setCheckoutPharmacyId(null)
    } catch {
      setError('في مشكلة اتصال… حاول تاني.')
    } finally {
      setLoading(false)
    }
  }

  function go(next: 'home' | 'search' | 'prescription' | 'allergy') {
    setView(next)
  }

  function goCheckout(prefPharmacyId?: number | null) {
    setCheckoutPharmacyId(prefPharmacyId ?? null)
    setReturnView(view === 'checkout' ? 'home' : (view as any))
    setDrawerOpen(false)
    setView('checkout')
  }

  async function reserveFromCart(pharmacy_id: number) {
    const items = cart.map(x => ({ trade_name: x.trade_name, qty: x.qty || 1 }))
    const out = await apiReserveOrder(pharmacy_id, items, patient)
    return out
  }

  function toggleCart(item: SearchResultBase) {
    const c = toCartItem(item)
    if (!c) return
    const exists = cart.some(x => x.drug_id === c.drug_id)
    const next = exists ? cart.filter(x => x.drug_id !== c.drug_id) : [...cart, c].slice(0, 12)
    setCart(next)
    setDrawerOpen(true)
  }

  async function checkInteractions() {
    const items = cart.map(x => ({ trade_name: x.trade_name, active_ingredient: x.active_ingredient }))
    return await apiInteractionsCheck(items)
  }

  const profileLabel = useMemo(() => {
    const a = patient.allergies.length
    const c = patient.conditions.length
    const m = patient.currentMeds.length
    const bits = [a ? `حساسية ${a}` : '', c ? `حالات ${c}` : '', m ? `أدوية ${m}` : ''].filter(Boolean)
    return bits.length ? `👤 ملفي: ${bits.join(' • ')}` : '👤 إعداد الملف'
  }, [patient.allergies.length, patient.conditions.length, patient.currentMeds.length])

  return (
    <div className="sp-app" dir="rtl">
      <Header profileLabel={profileLabel} onOpenProfile={() => { setWizardOpen(true); setProfileDismissed(false) }} />

      <main className="sp-container">
        {view === 'home' ? (
          <AgentHome
            patient={patient}
            onGoSearch={() => go('search')}
            onGoPrescription={() => go('prescription')}
            onGoAllergy={() => { setView('allergy'); setWizardOpen(true); setProfileDismissed(false) }}
            onOpenProfile={() => { setWizardOpen(true); setProfileDismissed(false) }}
          />
        ) : view === 'checkout' ? (
          <CheckoutPage
            items={cart}
            patient={patient}
            initialPharmacyId={checkoutPharmacyId}
            onBack={() => { setView(returnView); setDrawerOpen(true) }}
            onDone={() => { setView('home'); setDrawerOpen(false) }}
            onClearCart={() => setCart([])}
          />
        ) : (
          <>
            <div className="sp-toprow">
              <AllergyControl allergens={allergens} onChange={(vals) => setPatient({ ...patient, allergies: vals })} />
              <div className="sp-toprow__right">
                <button className="sp-pill" onClick={() => go('home')} type="button">🏠 الرئيسية</button>
                <button className="sp-pill primary" onClick={() => setDrawerOpen(true)} type="button">
                  🧪 تفاعلات ({cart.length})
                </button>
              </div>
            </div>

            {view === 'search' ? (
              <>
                <SearchBar
                  query={query}
                  setQuery={setQuery}
                  onSearch={() => doSearch()}
                  onOcrFile={doOcr}
                  loading={loading}
                  analyzing={analyzing}
                  mode={view}
                  onGoSearch={() => go('search')}
                  onGoPrescription={() => go('prescription')}
                />

                {loading && <div className="sp-loading">🔄 جاري البحث…</div>}
                {emptyState && <div className="sp-empty">{emptyState}</div>}

                <section className="sp-grid" aria-live="polite">
                  {results.map((item) => (
                    <ResultCard
                      key={item.drug_id}
                      item={item}
                      allergens={allergens}
                      inCart={cart.some(x => x.drug_id === item.drug_id)}
                      onToggleCart={toggleCart}
                      patient={patient}
                    />
                  ))}
                </section>
              </>
            ) : view === 'prescription' ? (
              <PrescriptionValidator patient={patient} onGoSearch={() => go('search')} onAddToCart={addRxToCart} />
            ) : (
              <div className="sp-empty">اختار من الرئيسية: بحث أو روشتة.</div>
            )}
          </>
        )}
      </main>

      <CartDrawer
        items={cart}
        open={drawerOpen}
        patient={patient}
        onClose={() => setDrawerOpen(false)}
        onCheckout={() => goCheckout()}
        onRemove={(id) => setCart(cart.filter(x => x.drug_id !== id))}
        onClear={() => setCart([])}
        onSetQty={(id, qty) => setCart(cart.map(x => x.drug_id === id ? { ...x, qty } : x))}
        onCheck={checkInteractions}
        onReserve={async (pharmacy_id) => { setCheckoutPharmacy(pharmacy_id); const out = await reserveFromCart(pharmacy_id); return out }}
      />

      <ChatWidget onSend={(text) => apiChat(text, patient)} />

      <PatientWizard
        open={wizardOpen}
        initial={patient}
        onClose={() => { setWizardOpen(false); setProfileDismissed(true) }}
        onSave={(ctx) => { setPatient(ctx); setWizardOpen(false); setProfileDismissed(true) }}
      />
    </div>
  )
}
