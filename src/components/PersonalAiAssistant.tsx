'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';

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
  const [persona, setPersona] = useState<'everyday' | 'tech' | 'fashion' | 'gourmet' | 'beauty'>('everyday');
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

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [messages, isOpen]);

  // Listen to open-ai event from any button (e.g. from ExploreFeedClient)
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
      const res = await fetchWithCsrf('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          persona,
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
        setFeedNotification('✨ Your explore feed was just personalized to match this conversation!');
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
      {/* Floating Trigger Button */}
      <button
        id="personal-ai-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Personal AI Shopping Guide"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 20px',
          borderRadius: '9999px',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
          border: '1px solid #334155',
          cursor: 'pointer',
          fontWeight: 600,
          fontSize: '14px',
          transition: 'transform 0.2s, background-color 0.2s',
        }}
      >
        <span style={{ fontSize: '18px' }}>✨</span>
        <span>{isOpen ? 'Close AI Guide' : 'Personal AI Guide'}</span>
      </button>

      {/* Slide-over Drawer / Chat Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Personal AI Shopping Companion"
          style={{
            position: 'fixed',
            bottom: '84px',
            right: '24px',
            zIndex: 50,
            width: 'min(92vw, 420px)',
            height: 'min(80vh, 620px)',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 18px',
              backgroundColor: '#0f172a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>✨</span>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>ShopSphere AI</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    backgroundColor: '#10b981',
                    color: '#064e3b',
                    padding: '2px 6px',
                    borderRadius: '9999px',
                  }}
                >
                  Live
                </span>
              </div>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#94a3b8' }}>
                Understands your style, answers questions & customizes your feed in ₹.
              </p>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px',
              }}
            >
              ✕
            </button>
          </div>

          {/* Persona Selector Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              overflowX: 'auto',
            }}
          >
            {[
              { id: 'everyday', label: 'Everyday' },
              { id: 'tech', label: 'Tech Guru' },
              { id: 'fashion', label: 'Stylist' },
              { id: 'gourmet', label: 'Gourmet' },
              { id: 'beauty', label: 'Beauty' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPersona(p.id as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: persona === p.id ? '1px solid #0f172a' : '1px solid #cbd5e1',
                  backgroundColor: persona === p.id ? '#0f172a' : '#ffffff',
                  color: persona === p.id ? '#ffffff' : '#475569',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Notification banner when feed is mutated */}
          {feedNotification && (
            <div
              style={{
                backgroundColor: '#ecfdf5',
                color: '#065f46',
                fontSize: '11px',
                fontWeight: 600,
                padding: '8px 14px',
                borderBottom: '1px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{feedNotification}</span>
              <button
                onClick={() => setFeedNotification(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#065f46' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Message List */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundColor: '#fdfdfe',
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '86%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    backgroundColor: m.role === 'user' ? '#0f172a' : '#f1f5f9',
                    color: m.role === 'user' ? '#ffffff' : '#0f172a',
                    fontSize: '13px',
                    lineHeight: '1.5',
                  }}
                >
                  {m.content}
                </div>

                {/* Render Recommended Products if returned */}
                {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      marginTop: '4px',
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>
                      Recommended for You:
                    </span>
                    {m.recommendedProducts.map((prod) => (
                      <Link
                        key={prod.id}
                        href={`/product/${prod.id}`}
                        onClick={() => setIsOpen(false)}
                        style={{
                          textDecoration: 'none',
                          color: 'inherit',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 10px',
                          backgroundColor: '#ffffff',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '6px',
                            backgroundColor: '#f1f5f9',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: '18px',
                            flexShrink: 0,
                          }}
                        >
                          📦
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {prod.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>
                              {formatINR(prod.price)}
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748b' }}>
                              ★ {Number(prod.average_rating || 5).toFixed(1)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  padding: '8px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#f1f5f9',
                  color: '#64748b',
                  fontSize: '12px',
                  fontStyle: 'italic',
                }}
              >
                AI is searching Indian marketplace catalog and tailoring recommendations...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick suggestions pills */}
          <div
            style={{
              padding: '6px 12px',
              backgroundColor: '#f8fafc',
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
            }}
          >
            {[
              'Smartphones under ₹15,000',
              'Wireless earbuds under ₹2,000',
              'Trending festive kurta & fashion',
              'Kitchen cookware essentials',
            ].map((pill, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(pill)}
                style={{
                  whiteSpace: 'nowrap',
                  fontSize: '11px',
                  padding: '4px 9px',
                  borderRadius: '4px',
                  backgroundColor: '#e2e8f0',
                  color: '#334155',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                {pill}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            style={{
              padding: '12px',
              backgroundColor: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '8px',
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything or search with budget in ₹..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                backgroundColor: loading || !inputMessage.trim() ? '#94a3b8' : '#0f172a',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '13px',
                cursor: loading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
