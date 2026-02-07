import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatMessage } from '../types';

type Props = {
  onSend: (text: string) => Promise<string>;
};

export function ChatWidget({ onSend }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { sender: 'bot', text: 'أهلاً 👋 اكتب سؤالك عن دواء/تجميل أو طريقة استخدام.' },
  ]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const canSend = useMemo(() => draft.trim().length > 0 && !loading, [draft, loading]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open]);

  async function send() {
    const text = draft.trim();
    if (!text || loading) return;
    setDraft('');
    setMessages((p) => [...p, { sender: 'user', text }]);
    setLoading(true);
    try {
      const reply = await onSend(text);
      setMessages((p) => [...p, { sender: 'bot', text: reply || 'تمام ✅' }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const friendly =
        /AI_AUTH_FAILED|GEMINI_API_KEY|API Key/i.test(msg)
          ? 'المساعد محتاج إعدادات: تأكد إن GEMINI_API_KEY صحيح ومفعّل لخدمة Gemini.'
          : /Request failed|Search failed|fetch/i.test(msg)
            ? 'في مشكلة اتصال دلوقتي… تأكد إن الـ Backend شغال وجرب تاني.'
            : 'حصلت مشكلة غير متوقعة… جرّب تاني.'
      setMessages((p) => [...p, { sender: 'bot', text: friendly }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sp-chat">
      {open ? (
        <div className="sp-chatbox" aria-label="Chat">
          <div className="sp-chatbox__header">
            <div className="sp-chatbox__title">🤖 مساعد الصيدلية</div>
            <button className="sp-icon-btn" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>

          <div className="sp-chatbox__body" ref={scrollerRef}>
            {messages.map((m, i) => (
              <div key={i} className={`sp-msg ${m.sender === 'user' ? 'sp-msg--user' : 'sp-msg--bot'}`}>
                {m.text}
              </div>
            ))}
            {loading && <div className="sp-msg sp-msg--bot">…</div>}
          </div>

          <div className="sp-chatbox__footer">
            <input
              className="sp-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="اسأل هنا…"
            />
            <button className="sp-btn" onClick={send} disabled={!canSend}>
              إرسال
            </button>
          </div>
        </div>
      ) : (
        <button className="sp-chatbtn" onClick={() => setOpen(true)} aria-label="Open chat">
          💬
        </button>
      )}
    </div>
  );
}
