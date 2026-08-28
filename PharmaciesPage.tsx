import { useState, useEffect } from 'react'
import { MapPin, Phone, ShoppingCart, Trash2, Plus, Minus, Loader2, CheckCircle, AlertTriangle, Package } from 'lucide-react'
import { api, type Pharmacy, type OrderResult } from '../lib/api'
import { useCart, usePatient } from '../hooks/use-patient'

export function PharmaciesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPharmacy, setSelectedPharmacy] = useState<number | null>(null)
  const [ordering, setOrdering] = useState(false)
  const [orderResult, setOrderResult] = useState<OrderResult | null>(null)
  const { cart, addItem, removeItem, updateQty, clearCart, totalItems } = useCart()
  const { profile } = usePatient()

  useEffect(() => {
    api.pharmacies()
      .then(res => { setPharmacies(res.pharmacies); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  const doReserve = async () => {
    if (!selectedPharmacy || cart.length === 0) return
    setOrdering(true)
    setOrderResult(null)
    try {
      const ctx = profile.age || profile.sex ? profile : undefined
      const result = await api.reserve(selectedPharmacy, cart.map(x => ({ trade_name: x.trade_name, qty: x.qty })), ctx)
      setOrderResult(result)
      clearCart()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ في الحجز')
    } finally {
      setOrdering(false)
    }
  }

  if (orderResult) {
    const pharmacy = pharmacies.find(p => p.id === orderResult.pharmacy_id)
    return (
      <div className="min-h-dvh px-4 py-8">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-xl font-black text-gray-800">تم الحجز بنجاح!</h2>
          <p className="text-gray-500 text-sm mt-1">كود الطلب: <span className="font-bold text-green-600 text-base">{orderResult.order_code}</span></p>
          {pharmacy && <p className="text-gray-600 text-sm mt-1">{pharmacy.name}</p>}
        </div>

        <div className="sp-card p-4 space-y-2.5 mb-4">
          <p className="font-bold text-sm text-gray-700 mb-3">تفاصيل الطلب:</p>
          {orderResult.items.map(item => (
            <div key={item.trade_name} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.available ? 'bg-green-500' : 'bg-red-400'}`} />
                <span className="text-sm font-medium text-gray-700">{item.trade_name}</span>
                <span className="text-xs text-gray-400">x{item.qty}</span>
              </div>
              <div className="text-left">
                {item.available && item.unit_price != null ? (
                  <span className="text-sm font-bold text-green-700">{item.unit_price * item.qty} ج</span>
                ) : (
                  <span className="text-xs text-red-500">غير متاح</span>
                )}
              </div>
            </div>
          ))}
          <div className="flex justify-between pt-2 border-t border-gray-100">
            <span className="font-bold text-gray-800">الإجمالي</span>
            <span className="font-black text-green-700 text-lg">{orderResult.total} ج</span>
          </div>
        </div>

        <button onClick={() => setOrderResult(null)} className="sp-btn sp-btn-primary w-full">
          طلب جديد
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh">
      <div className="hero-bg px-4 pt-10 pb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-black text-xl">🏥 الصيدليات</h1>
            <p className="text-white/70 text-xs mt-0.5">احجز أدويتك في أقرب صيدلية</p>
          </div>
          {totalItems > 0 && (
            <div className="bg-white/20 rounded-xl px-3 py-1.5 flex items-center gap-1.5">
              <ShoppingCart size={16} className="text-white" />
              <span className="text-white font-bold text-sm">{totalItems}</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">
        {cart.length > 0 && (
          <div className="sp-card p-4">
            <div className="section-title mb-3">
              <Package size={17} className="text-green-600" />
              سلة التسوق ({totalItems} عنصر)
            </div>
            <div className="space-y-2 mb-4">
              {cart.map(item => (
                <div key={item.trade_name} className="flex items-center justify-between bg-green-50 rounded-xl px-3 py-2.5">
                  <span className="font-semibold text-sm text-gray-800 flex-1 truncate">{item.trade_name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => updateQty(item.trade_name, item.qty - 1)} className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm text-green-600 hover:bg-green-100">
                      <Minus size={12} />
                    </button>
                    <span className="text-sm font-bold text-gray-800 min-w-[20px] text-center">{item.qty}</span>
                    <button onClick={() => addItem(item.trade_name)} className="w-7 h-7 bg-white rounded-lg flex items-center justify-center shadow-sm text-green-600 hover:bg-green-100">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => removeItem(item.trade_name)} className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-100">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {error && (
              <div className="flag-danger mb-3 flex items-start gap-2">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}
            {selectedPharmacy && (
              <button
                onClick={doReserve}
                disabled={ordering}
                className="sp-btn sp-btn-primary w-full"
              >
                {ordering ? <><Loader2 size={16} className="animate-spin" /> جاري الحجز...</> : <><CheckCircle size={16} /> احجز في الصيدلية</>}
              </button>
            )}
            {!selectedPharmacy && (
              <p className="text-center text-sm text-gray-500">👇 اختار صيدلية أولًا</p>
            )}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={32} className="animate-spin text-green-500" />
            <p className="text-sm text-gray-500">تحميل الصيدليات...</p>
          </div>
        )}

        {!loading && pharmacies.length > 0 && (
          <div>
            <div className="section-title">
              <MapPin size={17} className="text-green-600" />
              اختار الصيدلية
            </div>
            <div className="space-y-3">
              {pharmacies.map(pharmacy => {
                const isSelected = selectedPharmacy === pharmacy.id
                return (
                  <div
                    key={pharmacy.id}
                    onClick={() => setSelectedPharmacy(isSelected ? null : pharmacy.id)}
                    className={`sp-card p-4 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-green-500 bg-green-50/50' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0 text-base">🏥</div>
                          <h3 className="font-bold text-sm text-gray-800 leading-tight">{pharmacy.name}</h3>
                        </div>
                        {pharmacy.address && (
                          <div className="flex items-start gap-1.5 mt-1">
                            <MapPin size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-gray-500 leading-relaxed">{pharmacy.address}</p>
                          </div>
                        )}
                        {pharmacy.phone && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Phone size={12} className="text-gray-400 flex-shrink-0" />
                            <a href={`tel:${pharmacy.phone}`} className="text-xs text-green-600 font-medium" onClick={e => e.stopPropagation()}>
                              {pharmacy.phone}
                            </a>
                          </div>
                        )}
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                        {isSelected && <CheckCircle size={14} className="text-white" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {cart.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-400">
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-40" />
            <p className="font-semibold">السلة فاضية</p>
            <p className="text-sm mt-1">ابحث عن أدوية وأضفها للسلة أولًا</p>
          </div>
        )}
      </div>
    </div>
  )
}
