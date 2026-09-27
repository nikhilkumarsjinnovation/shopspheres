'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open Personal AI Shopping Guide"
      >
        <span>{isOpen ? 'Close guide' : 'AI guide'}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Personal AI Shopping Companion"
        >
          <div>
            <div>
              <div>
                <span
                >
                  ShopSphere Guide
                </span>
                <span
                >
                  Live
                </span>
              </div>
              <p>
                Understands your style, answers questions & customizes your feed in ₹.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close guide"
            >
              ✕
            </button>
          </div>

          <PersonaSelector value={persona} onChange={setPersona} />

          {feedNotification && (
            <div
            >
              <span>{feedNotification}</span>
              <button
                type="button"
                onClick={() => setFeedNotification(null)}
              >
                ✕
              </button>
            </div>
          )}

          <div>
            {messages.map((m, index) => (
              <div
                key={m.id}
              >
                <div
                >
                  {m.content}
                </div>

                {m.recommendedProducts && m.recommendedProducts.length > 0 && (
                  <div
                  >
                    <span
                    >
                      Recommended for you
                    </span>
                    {m.recommendedProducts.map((prod) => (
                      <Link
                        key={prod.id}
                        href={`/product/${prod.id}`}
                        onClick={() => setIsOpen(false)}
                      >
                        <div
                        />
                        <div>
                          <p
                          >
                            {prod.title}
                          </p>
                          <div>
                            <span>
                              {formatINR(prod.price)}
                            </span>
                            <span>
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
              >
                Searching the catalog and tuning recommendations…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div>
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
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything or search with budget in ₹..."
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
