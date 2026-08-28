import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'
import { api } from '../lib/api'
import { usePatient } from '../hooks/use-patient'

interface Message {
  id: string
  role: 'user' | 'ai'
  text: string
  provider?: string
}

const suggestions = [
  'إيه الفرق بين الباراسيتامول والإبيبروفين؟',
  'الأموكسيسيلين ممكن آخده مع الحليب؟',
  'أدوية الضغط لازم تتاخد إمتى؟',
  'إيه أعراض الحساسية من البنسلين؟',
]

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'ai',
      text: 'أهلًا! أنا مساعدك الصيدلي الذكي 💊\nسألني عن أي دواء، تداخلات، أو نصائح صحية — وأنا هنا أساعدك!',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const { profile } = usePatient()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: text.trim() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const ctx = profile.age || profile.sex || profile.allergies.length ? profile : undefined
      const res = await api.chat(text.trim(), ctx)
      setMessages(prev => [...prev, { id: Date.now().toString() + 'ai', role: 'ai', text: res.reply, provider: res.provider }])
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now().toString() + 'err',
        role: 'ai',
        text: 'عفوًا، حدث خطأ. جرّب تاني.',
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-dvh bg-background">
      <div className="hero-bg px-4 pt-10 pb-5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-lg leading-tight">المساعد الصيدلي</h1>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
              <span className="text-white/70 text-xs">متصل دايمًا</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'} animate-fade-up`}
            style={{ animationDelay: `${Math.min(i, 5) * 0.05}s` }}
          >
            {msg.role === 'ai' && (
              <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 ml-2 mt-1">
                <Sparkles size={13} className="text-emerald-600" />
              </div>
            )}
            <div className={msg.role === 'user' ? 'chat-user' : 'chat-ai'}>
              <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
              {msg.provider && msg.role === 'ai' && (
                <p className="text-[10px] text-gray-400 mt-1.5 text-left">
                  {msg.provider === 'gemini' ? '✨ Gemini AI' : '🤖 مساعد ذكي'}
                </p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                <User size={13} className="text-green-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-end animate-fade-up">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center ml-2">
              <Sparkles size={13} className="text-emerald-600" />
            </div>
            <div className="chat-ai flex items-center gap-1.5">
              <div className="loading-dots flex gap-1">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto flex-shrink-0">
          {suggestions.map(s => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="sp-badge sp-badge-green flex-shrink-0 cursor-pointer hover:bg-green-200 transition-colors py-1.5 px-3 text-xs"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-4 py-3 bg-white border-t border-green-100 flex items-end gap-2 flex-shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="اكتب سؤالك هنا..."
          rows={1}
          className="sp-input resize-none !py-3 flex-1"
          style={{ minHeight: 46, maxHeight: 120 }}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="sp-btn sp-btn-primary flex-shrink-0 !p-3 rounded-xl"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </form>
    </div>
  )
}
