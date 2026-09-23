'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import PersonaSelector from '@/components/ai/PersonaSelector';
import VoiceInterface from '@/components/ai/VoiceInterface';
import VisualSearch from '@/components/ai/VisualSearch';
import * as assistantStyles from '@/components/ai/assistant.css';
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
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Personal AI Shopping Guide"
        className={assistantStyles.trigger}
      >
        <span>{isOpen ? 'Close guide' : 'AI guide'}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Personal AI Shopping Companion"
          className={assistantStyles.panel}
        >
          <div className={assistantStyles.header}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  style={{
                    fontFamily: 'var(--font-display), sans-serif',
                    fontWeight: 800,
                    fontSize: 16,
                    letterSpacing: '-0.02em',
                  }}
                >
                  ShopSphere Guide
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    backgroundColor: '#d6ff3a',
                    color: '#07101f',
                    padding: '3px 8px',
                    borderRadius: 999,
                  }}
                >
                  Live
                </span>
              </div>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#8a96ab', maxWidth: '28rem' }}>
                Understands your style, answers questions & customizes your feed in ₹.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close guide"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid #243048',
                color: '#eef2f8',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          <PersonaSelector value={persona} onChange={setPersona} />

          {feedNotification && (
            <div
              style={{
                backgroundColor: '#dce6ff',
                color: '#2457ff',
                fontSize: 12,
                fontWeight: 700,
                padding: '10px 14px',
                borderBottom: '1px solid #c5cedc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <span>{feedNotification}</span>
              <button
                type="button"
                onClick={() => setFeedNotification(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#2457ff',
                  fontWeight: 800,
                }}
              >
                ✕
              </button>
            </div>
          )}

          <div className={assistantStyles.messages}>
            {messages.map((m, index) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  transform:
                    m.role === 'assistant' && index % 2 === 0
                      ? 'translateX(-2px)'
                      : m.role === 'user'
                        ? 'translateX(2px)'
                        : undefined,
                }}
              >
                <div
                  className={
                    m.role === 'user'
                      ? assistantStyles.bubbleUser
                      : assistantStyles.bubbleAssistant
                  }
                >
                  {m.content}
                </div>

                {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: '#5a6578',
                        borderLeft: '3px solid #d6ff3a',
                        paddingLeft: 8,
                      }}
                    >
                      Recommended for you
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
                          gap: 10,
                          padding: '10px 12px',
                          backgroundColor: '#ffffff',
                          borderRadius: 12,
                          border: '1px solid #c5cedc',
                          boxShadow: '0 4px 12px rgba(7,16,31,0.06)',
                        }}
                      >
                        <div
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 10,
                            backgroundColor: '#e8edf4',
                            backgroundImage:
                              prod.image_urls?.[0]
                                ? `url(${prod.image_urls[0]})`
                                : undefined,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              margin: 0,
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#07101f',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {prod.title}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 800, color: '#2457ff' }}>
                              {formatINR(prod.price)}
                            </span>
                            <span style={{ fontSize: 11, color: '#5a6578' }}>
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
                className={assistantStyles.bubbleAssistant}
                style={{ alignSelf: 'flex-start', fontStyle: 'italic', color: '#5a6578' }}
              >
                Searching the catalog and tuning recommendations…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className={assistantStyles.suggestionRow}>
            {[
              'Smartphones under ₹15,000',
              'Wireless earbuds under ₹2,000',
              'Trending festive kurta & fashion',
              'Kitchen cookware essentials',
            ].map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => handleSendMessage(pill)}
                className={assistantStyles.suggestionPill}
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
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
            className={assistantStyles.composer}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything or search with budget in ₹..."
              disabled={loading}
              className={assistantStyles.composerInput}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className={assistantStyles.sendBtn}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
