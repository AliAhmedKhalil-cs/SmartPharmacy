import { Plus, Pill, Sparkles, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { useState } from 'react'
import type { SearchResult } from '../lib/api'

interface DrugCardProps {
  drug: SearchResult
  onAddToCart: (name: string) => void
}

export function DrugCard({ drug, onAddToCart }: DrugCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isCosmetic = drug.type === 'cosmetic'
  const hasAlts = (drug.alternatives ?? []).length > 0
  const hasLocations = (drug.available_locations ?? []).length > 0

  return (
    <div className="sp-card p-4 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`rounded-xl p-2.5 flex-shrink-0 ${isCosmetic ? 'bg-purple-50' : 'bg-green-50'}`}>
            {isCosmetic ? <Sparkles size={18} className="text-purple-500" /> : <Pill size={18} className="text-green-600" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-gray-900 leading-tight mb-0.5 truncate">{drug.trade_name}</h3>
            {drug.active_ingredient && (
              <p className="text-xs text-gray-500 mb-1.5">{drug.active_ingredient}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              {drug.therapeutic_group && (
                <span className="sp-badge sp-badge-green">{drug.therapeutic_group}</span>
              )}
              {drug.form && <span className="sp-badge sp-badge-blue">{drug.form}</span>}
              {isCosmetic && <span className="sp-badge sp-badge-purple">مستحضر تجميل</span>}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {drug.avg_price != null && (
            <span className="price-tag">
              <span className="text-xs text-gray-400 font-normal">~</span>
              {drug.avg_price} ج
            </span>
          )}
          <button
            onClick={() => onAddToCart(drug.trade_name)}
            className="sp-btn sp-btn-primary sp-btn-sm"
            title="أضف للسلة"
          >
            <Plus size={14} />
            أضف
          </button>
        </div>
      </div>

      {drug.description && (
        <p className="text-xs text-gray-500 mt-2 leading-relaxed">{drug.description}</p>
      )}

      {(hasAlts || hasLocations) && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-1 text-xs text-green-600 font-semibold mt-3 hover:text-green-700"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {expanded ? 'إخفاء التفاصيل' : 'بدائل ومتاح في'}
        </button>
      )}

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-green-50 pt-3">
          {hasAlts && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">بدائل متاحة:</p>
              <div className="flex flex-wrap gap-1.5">
                {drug.alternatives.map(alt => (
                  <div key={alt.trade_name} className="flex items-center gap-1 bg-green-50 rounded-lg px-2.5 py-1">
                    <span className="text-xs font-semibold text-green-800">{alt.trade_name}</span>
                    {alt.avg_price != null && (
                      <span className="text-[11px] text-green-600">({alt.avg_price} ج)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {hasLocations && (
            <div>
              <p className="text-xs font-bold text-gray-600 mb-2">متاح في صيدليات:</p>
              <div className="space-y-1.5">
                {drug.available_locations.map(loc => (
                  <div key={loc.pharmacy_id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={12} className="text-green-500 flex-shrink-0" />
                      <span className="text-xs text-gray-700">{loc.name}</span>
                    </div>
                    <span className="text-xs font-bold text-green-700">{loc.price} ج</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
