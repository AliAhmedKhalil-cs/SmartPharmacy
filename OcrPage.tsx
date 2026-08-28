import { useState, useRef } from 'react'
import { Camera, Upload, Loader2, Plus, CheckCircle, AlertTriangle, FileImage, Trash2 } from 'lucide-react'
import { api } from '../lib/api'
import { useCart } from '../hooks/use-patient'

export function OcrPage() {
  const [preview, setPreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mime, setMime] = useState('image/jpeg')
  const [drugs, setDrugs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const { addItem, cart } = useCart()

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('الملف مش صورة. اختار صورة صحيحة.')
      return
    }
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)
      const b64 = dataUrl.split(',')[1] ?? ''
      setImageBase64(b64)
      setMime(file.type)
      setDrugs([])
      setDone(false)
      setError(null)
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  const extractDrugs = async () => {
    if (!imageBase64) return
    setLoading(true)
    setError(null)
    setDrugs([])
    setDone(false)
    try {
      const names = await api.ocr(imageBase64, mime)
      setDrugs(names)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ في قراءة الروشتة')
    } finally {
      setLoading(false)
    }
  }

  const addAllToCart = () => {
    drugs.forEach(d => addItem(d))
  }

  const isInCart = (name: string) => cart.some(x => x.trade_name === name)

  const reset = () => {
    setPreview(null)
    setImageBase64(null)
    setDrugs([])
    setDone(false)
    setError(null)
  }

  return (
    <div className="min-h-dvh">
      <div className="hero-bg px-4 pt-10 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Camera size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl">قراءة الروشتة</h1>
            <p className="text-white/70 text-xs">صوّر روشتتك ونفكك الأدوية بالذكاء الاصطناعي</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {!preview ? (
          <div
            className="border-2 border-dashed border-green-300 rounded-2xl p-8 text-center cursor-pointer hover:border-green-500 hover:bg-green-50/50 transition-all"
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
          >
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileImage size={28} className="text-green-500" />
            </div>
            <p className="font-bold text-gray-700 mb-1">ارفع صورة الروشتة</p>
            <p className="text-sm text-gray-500 mb-4">اسحب وأفلت أو اضغط للاختيار</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                className="sp-btn sp-btn-primary sp-btn-sm"
              >
                <Upload size={14} />
                اختر صورة
              </button>
            </div>
          </div>
        ) : (
          <div className="sp-card p-3">
            <div className="relative">
              <img src={preview} alt="الروشتة" className="w-full rounded-xl object-contain max-h-64" />
              <button
                onClick={reset}
                className="absolute top-2 left-2 bg-red-500 text-white p-1.5 rounded-lg hover:bg-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={extractDrugs}
                disabled={loading}
                className="sp-btn sp-btn-primary flex-1"
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> جاري القراءة...</>
                ) : (
                  <><Camera size={16} /> اقرأ الروشتة</>
                )}
              </button>
              <button onClick={reset} className="sp-btn sp-btn-secondary sp-btn-sm">
                تغيير
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="flag-danger flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-red-700">خطأ في القراءة</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {done && drugs.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-bold text-gray-600">مش قدرنا نقرأ أسماء أدوية</p>
            <p className="text-sm text-gray-400 mt-1">جرب صورة أوضح للروشتة</p>
          </div>
        )}

        {drugs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="section-title mb-0">
                <CheckCircle size={18} className="text-green-600" />
                الأدوية المكتشفة
              </div>
              <button onClick={addAllToCart} className="sp-btn sp-btn-secondary sp-btn-sm">
                <Plus size={13} />
                أضف الكل
              </button>
            </div>
            <div className="space-y-2">
              {drugs.map((drug, i) => (
                <div key={i} className="sp-card p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center text-sm">💊</div>
                    <span className="font-semibold text-sm text-gray-800">{drug}</span>
                  </div>
                  <button
                    onClick={() => addItem(drug)}
                    className={`sp-btn sp-btn-sm ${isInCart(drug) ? 'sp-btn-secondary' : 'sp-btn-primary'}`}
                  >
                    {isInCart(drug) ? <CheckCircle size={13} /> : <Plus size={13} />}
                    {isInCart(drug) ? 'في السلة' : 'أضف'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
    </div>
  )
}
