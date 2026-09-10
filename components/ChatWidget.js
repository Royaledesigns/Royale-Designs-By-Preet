'use client';

import { useEffect, useRef, useState } from 'react';
import siteConfig from '@/components/SiteConfig';

// Floating "chat with us" widget shown on every page (mounted once in
// app/layout.js). Answers common questions (shipping, sizing, returns,
// custom stitching, etc.) using the AI assistant at /api/chat, which is
// grounded in real facts about the business so it doesn't make things up.
const GREETING = `Hi! I'm here to help with questions about ${siteConfig.shortName} — shipping, sizing, custom orders, returns and more. What would you like to know?`;

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', text: GREETING }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function handleSend(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user', text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history: nextMessages.slice(0, -1) }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Could not get a reply right now.');
      }

      // The reply streams in as plain text chunks — append each one to a
      // live assistant bubble so it visibly types itself out instead of
      // the shopper waiting on "Typing…" for the whole answer at once.
      let streamed = '';
      let started = false;
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        streamed += chunk;
        if (!started) {
          started = true;
          setLoading(false);
          setMessages((prev) => [...prev, { role: 'assistant', text: streamed }]);
        } else {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], text: streamed };
            return next;
          });
        }
      }
      if (!started) {
        throw new Error('Could not get a reply right now.');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: err.message || 'Something went wrong — please try again.', isError: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[92vw] max-w-[360px] h-[70vh] max-h-[520px] bg-cream border border-forest/15 rounded-sm shadow-xl flex flex-col overflow-hidden">
          <div className="bg-forest text-cream px-4 py-3 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="font-serif text-lg leading-tight">{siteConfig.shortName}</p>
              <p className="text-[11px] uppercase tracking-widest text-cream/70">Chat with us</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream/10 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] text-sm leading-relaxed px-3.5 py-2.5 rounded-sm ${
                    m.role === 'user'
                      ? 'bg-forest text-cream'
                      : m.isError
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-white text-forest-dark border border-forest/10'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white text-forest/60 border border-forest/10 text-sm px-3.5 py-2.5 rounded-sm">
                  Typing…
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-forest/10 p-3 flex-shrink-0 bg-cream">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question…"
              className="flex-1 border border-forest/20 rounded-sm px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gold"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-full bg-gold text-forest-dark hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12h16M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close chat' : 'Chat with us'}
        className="w-14 h-14 rounded-full bg-forest text-cream shadow-lg flex items-center justify-center hover:bg-forest-dark transition-colors"
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
