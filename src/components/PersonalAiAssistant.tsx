'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, Send, X, Bot } from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import PersonaSelector from '@/components/ai/PersonaSelector';
import VoiceInterface from '@/components/ai/VoiceInterface';
import VisualSearch from '@/components/ai/VisualSearch';
import type { PersonaConfig } from '@/lib/personas';

export interface RecommendedProduct {
  id: string;
  title: string;
  price: number;
  compare_at_price?: number | null;
  image_urls: string[];
  category: string;
  average_rating: number;
  stock: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendedProducts?: RecommendedProduct[];
}

interface PersonalAiAssistantProps {
  onFeedUpdated?: () => void;
}

export default function PersonalAiAssistant({ onFeedUpdated }: PersonalAiAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [persona, setPersona] = useState<PersonaConfig['id']>('everyday');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedNotification, setFeedNotification] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Namaste! I'm your **Personal AI Shopping Companion**. Tell me what you're looking for, your budget in ₹, or festival occasion, and I'll find the best options and tune your marketplace feed in real time!",
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef(`sess_${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  useEffect(() => {
    const handleOpenAi = () => {
      setIsOpen(true);
    };

    window.addEventListener('shopsphere:open-ai', handleOpenAi);
    return () => {
      window.removeEventListener('shopsphere:open-ai', handleOpenAi);
    };
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const res = await fetchWithCsrf('/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          persona,
          sessionId: sessionIdRef.current,
        }),
      });

      if (!res.ok) {
        let message = 'Failed to get a response from AI';
        try {
          const data: unknown = await res.json();
          if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
            message = data.error;
          }
        } catch {
          // Response body was not JSON.
        }
        throw new Error(message);
      }

      const data = await res.json();

      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        recommendedProducts: data.recommendedProducts || [],
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.feedUpdated) {
        setFeedNotification('Your explore feed was personalized to match this conversation.');
        onFeedUpdated?.();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('shopsphere:feed-updated', { detail: data }));
        }
        setTimeout(() => setFeedNotification(null), 5000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Sorry, I ran into an error retrieving recommendations. Please try again!';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: message,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        id="personal-ai-trigger"
        type="button"
        className="ai-floating-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Personal AI Shopping Guide"
      >
        <Sparkles size={16} />
        <span>{isOpen ? 'Close AI Guide' : 'Personal AI'}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Personal AI Shopping Companion"
          className="ai-assistant-drawer"
        >
          {/* Header */}
          <div className="ai-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Bot size={18} style={{ color: 'var(--accent-electric)' }} />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--fg-primary)' }}>
                  ShopSphere AI Companion
                </span>
                <span className="section-badge" style={{ fontSize: '0.62rem', padding: '0.1rem 0.45rem' }}>
                  Live
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                Curates recommendations in ₹ · Answers questions · Real-time feed tuning
              </p>
            </div>

            <button
              type="button"
              className="btn-card-toggle"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
              onClick={() => setIsOpen(false)}
              aria-label="Close guide"
            >
              <X size={14} />
            </button>
          </div>

          <PersonaSelector value={persona} onChange={setPersona} />

          {feedNotification && (
            <div
              style={{
                margin: '0.5rem 1rem 0',
                padding: '0.5rem 0.75rem',
                background: 'var(--accent-glow)',
                border: '1px solid rgba(79, 70, 229, 0.25)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.75rem',
                color: 'var(--accent-electric)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{feedNotification}</span>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '0.8rem' }}
                onClick={() => setFeedNotification(null)}
              >
                ✕
              </button>
            </div>
          )}

          <div className="ai-messages-pane">
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === 'assistant' ? 'ai-bubble-assistant' : 'ai-bubble-user'}
              >
                <div>{m.content}</div>

                {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <span
                      style={{
                        display: 'block',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        color: 'var(--accent-electric)',
                        marginBottom: '0.5rem',
                      }}
                    >
                      Recommended for you
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {m.recommendedProducts.map((prod) => (
                        <Link
                          key={prod.id}
                          href={`/product/${prod.id}`}
                          onClick={() => setIsOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.65rem',
                            padding: '0.45rem',
                            background: 'var(--bg-canvas)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            textDecoration: 'none',
                          }}
                        >
                          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', overflow: 'hidden', flexShrink: 0 }}>
                            {prod.image_urls?.[0] && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={prod.image_urls[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--fg-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {prod.title}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem' }}>
                              <span style={{ fontWeight: 700, color: 'var(--fg-primary)' }}>
                                {formatINR(prod.price)}
                              </span>
                              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                                ★ {Number(prod.average_rating || 5).toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem' }}>
                <Sparkles size={14} className="pulse-badge" /> Searching catalog and tuning recommendations…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="ai-prompt-chips-row">
            {[
              'Smartphones under ₹15,000',
              'Wireless earbuds under ₹2,000',
              'Trending festive kurta & fashion',
              'Kitchen cookware essentials',
            ].map((pill) => (
              <button
                key={pill}
                type="button"
                className="ai-prompt-chip"
                onClick={() => handleSendMessage(pill)}
              >
                {pill}
              </button>
            ))}
          </div>

          {false && <VisualSearch />}
          {false && (
            <VoiceInterface onTranscript={(text) => { void handleSendMessage(text); }} />
          )}

          <form
            className="ai-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="ai-input-field"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything or search with budget in ₹..."
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-card-add"
              style={{ padding: '0 1rem', height: '2.6rem', fontSize: '0.825rem' }}
              disabled={loading || !inputMessage.trim()}
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
