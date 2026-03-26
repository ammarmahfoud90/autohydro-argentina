/**
 * Floating AI Engineer chat component.
 * Mounts as a fixed overlay, context-aware with current calculation results.
 */

import { useState, useRef, useEffect } from 'react';
import type { HydrologyResult } from '../../types';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  results?: HydrologyResult | null;
}

const MAX_MESSAGES = 10; // per session (5 exchanges)

const QUICK_QUESTIONS = [
  '¿Este caudal es razonable para esta zona?',
  '¿Qué pasa si cambio el CN?',
  '¿Qué método me recomendás?',
  'Explicame el nivel de riesgo',
];

const BASE = import.meta.env.VITE_API_URL ?? '';

async function sendChatMessage(
  message: string,
  context: HydrologyResult | null | undefined,
  history: Message[],
): Promise<string> {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      context: context ?? null,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.response as string;
}

export function EngineerChat({ results }: Props) {
  const isOnline = useOnlineStatus();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const userMsgCount = messages.filter((m) => m.role === 'user').length;
  const remaining = MAX_MESSAGES - userMsgCount;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      inputRef.current?.focus();
    }
  }, [isOpen, messages.length]);

  async function handleSend(msg?: string) {
    const text = (msg ?? input).trim();
    if (!text || isLoading || remaining <= 0) return;

    setInput('');
    setError(null);
    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await sendChatMessage(text, results, newMessages.slice(0, -1));
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al conectar con el Ingeniero IA');
    } finally {
      setIsLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#0055A4] text-white shadow-lg hover:bg-[#004a91] transition-all flex items-center justify-center hover:scale-105 active:scale-95"
        title="Chat con Ingeniero IA"
        aria-label="Abrir chat con Ingeniero IA"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[340px] sm:w-[380px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden max-h-[75vh]">
          {/* Header */}
          <div className="bg-[#0055A4] px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-semibold text-sm">Ingeniero IA</div>
              <div className="text-blue-200 text-[10px]">
                {results
                  ? `Contexto: ${results.city} — T=${results.return_period}a`
                  : 'Consultas generales de hidrología'}
              </div>
            </div>
            <div className="text-blue-200 text-[10px] shrink-0">
              {remaining}/{MAX_MESSAGES} consultas
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 min-h-[120px]">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500 mb-3">Escribí tu consulta técnica</p>
                <div className="flex flex-col gap-1.5">
                  {QUICK_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSend(q)}
                      disabled={!isOnline}
                      className="text-left text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-40"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#0055A4] text-white rounded-br-sm'
                      : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-3 py-2 rounded-xl rounded-bl-sm shadow-sm">
                  <div className="flex gap-1 items-center h-4">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="px-3 py-2.5 bg-white border-t border-gray-100">
            {!isOnline ? (
              <p className="text-xs text-amber-600 text-center py-1">
                Chat requiere conexión a internet
              </p>
            ) : remaining <= 0 ? (
              <p className="text-xs text-gray-500 text-center py-1">
                Límite de consultas alcanzado (recargá para reiniciar)
              </p>
            ) : (
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Preguntale al ingeniero..."
                  rows={1}
                  className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 max-h-20"
                  style={{ lineHeight: '1.4' }}
                />
                <button
                  type="button"
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  className="shrink-0 w-8 h-8 rounded-full bg-[#0055A4] text-white flex items-center justify-center hover:bg-[#004a91] disabled:opacity-40 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
