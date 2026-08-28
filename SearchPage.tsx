import { useState, useRef } from 'react'
import { Search, X, AlertTriangle, Loader2 } from 'lucide-react'
import { api, type SearchResult } from '../lib/api'
import { DrugCard } from '../components/DrugCard'
import { useCart } from '../hooks/use-patient'

const quickSearches = ['باراسيتامول', 'اموكسيسيلين', 'ابيبروفين', 'مسكن', 'مضاد حيوي', 'ضغط', 'سكر', 'كوليسترول']

export function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const { addItem } = useCart()

  const doSearch = async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) return
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const data = await api.search(trimmed)
      setResults(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ في البحث')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(query)
  }

  const handleQuick = (q: string) => {
    setQuery(q)
    doSearch(q)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setSearched(false)
    setError(null)
    inputRef.current?.focus()
  }

  return (
    <div className="min-h-dvh">
      <div className="hero-bg px-4 pt-10 pb-6 sticky top-0 z-30">
        <h1 className="text-white font-black text-xl mb-4">🔍 بحث الأدوية</h1>
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="اكتب اسم الدواء أو المادة الفعالة..."
            className="w-full px-5 py-3.5 pr-12 rounded-2xl border-0 text-gray-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg"
            autoFocus
          />
          {query && (
            <button type="button" onClick={clearSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
          {!query && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300">
              <Search size={16} />
            </span>
          )}
        </form>
      </div>

      <div className="px-4 py-4 space-y-4">
        {!searched && (
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">بحث سريع:</p>
            <div className="flex flex-wrap gap-2">
              {quickSearches.map(q => (
                <button
                  key={q}
                  onClick={() => handleQuick(q)}
                  className="sp-btn sp-btn-secondary sp-btn-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 size={32} className="animate-spin text-green-500" />
            <p className="text-sm text-gray-500">جاري البحث...</p>
          </div>
        )}

        {error && (
          <div className="flag-danger flex items-start gap-3">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm text-red-700">خطأ في البحث</p>
              <p className="text-xs text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!loading && searched && results.length === 0 && !error && (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-bold text-gray-600 mb-1">مش لاقيين نتائج</p>
            <p className="text-sm text-gray-400">جرب كلمة تانية أو الاسم باللغة الإنجليزية</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-3">{results.length} نتيجة</p>
            <div className="space-y-3">
              {results.map((drug, i) => (
                <div key={String(drug.drug_id)} style={{ animationDelay: `${i * 0.04}s` }}>
                  <DrugCard drug={drug} onAddToCart={addItem} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
