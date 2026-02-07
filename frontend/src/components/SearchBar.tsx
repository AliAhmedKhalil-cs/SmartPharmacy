import { useRef } from 'react'

type Mode = 'search' | 'prescription' | 'allergy' | 'home'

type Props = {
  query: string
  setQuery: (v: string) => void
  onSearch: () => void
  onOcrFile: (file: File) => void
  loading?: boolean
  analyzing?: boolean
  mode?: Mode
  onGoSearch?: () => void
  onGoPrescription?: () => void
}

export function SearchBar({
  query,
  setQuery,
  onSearch,
  onOcrFile,
  loading,
  analyzing,
  mode = 'search',
  onGoSearch,
  onGoPrescription
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isRx = mode === 'prescription'

  return (
    <div className="sp-card">
      <div className="sp-search__tabs" role="tablist" aria-label="Mode">
        <button
          type="button"
          className={`sp-tab ${!isRx ? 'is-active' : ''}`}
          onClick={() => onGoSearch?.()}
        >
          🔎 بحث
        </button>
        <button
          type="button"
          className={`sp-tab ${isRx ? 'is-active' : ''}`}
          onClick={() => onGoPrescription?.()}
        >
          📷 روشتة
        </button>
      </div>

      <div className="sp-search">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            onOcrFile(f)
            e.currentTarget.value = ''
          }}
        />

        <button
          type="button"
          className="sp-cam"
          onClick={() => fileInputRef.current?.click()}
          disabled={Boolean(analyzing) || Boolean(loading)}
          title="صور الروشتة"
        >
          {analyzing ? '⏳' : '📷'}
        </button>

        <input
          className="sp-input sp-input--search"
          placeholder={isRx ? 'ارفع/صوّر الروشتة أو اكتب اسم دواء…' : 'ابحث عن دواء أو مستحضر تجميل...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          disabled={Boolean(analyzing)}
        />

        <button type="button" className="sp-btn primary" onClick={onSearch} disabled={Boolean(loading) || Boolean(analyzing)}>
          {isRx ? 'بحث بعد الروشتة' : 'بحث'}
        </button>
      </div>
    </div>
  )
}
