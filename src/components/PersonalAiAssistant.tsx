'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Send,
  X,
  Bot,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  Gift,
  Star,
  XCircle,
  Heart,
  ShoppingBag,
} from 'lucide-react';
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

export interface ActionCard {
  type:
    | 'PRODUCT_CAROUSEL'
    | 'WALLET_CARD'
    | 'WALLET_PAY_AUTH'
    | 'WALLET_TOPUP_PROMPT'
    | 'GIFT_CARD'
    | 'ORDER_CONFIRMED'
    | 'REVIEWABLE_LIST'
    | 'ORDER_CANCELLED';
  data: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  recommendedProducts?: RecommendedProduct[];
  actionCards?: ActionCard[];
  toolExecutions?: Array<{ toolName: string; args: any; result: any }>;
}

interface PersonalAiAssistantProps {
  onFeedUpdated?: () => void;
}

function ActionCardRenderer({
  card,
  onAction,
  onCloseDrawer,
  loading,
}: {
  card: ActionCard;
  onAction: (text: string) => void;
  onCloseDrawer: () => void;
  loading: boolean;
}) {
  if (card.type === 'WALLET_PAY_AUTH') {
    const { orderId, total, product, quantity, walletBalance, remainingBalance } = card.data;
    return (
      <div className="agent-action-card wallet-pay-auth-card">
        <div className="card-header">
          <div className="badge-agent-auth">
            <ShieldCheck size={15} />
            <span>One-Tap Wallet Authorization</span>
          </div>
          <span className="order-tag">#SS-{String(orderId).slice(0, 6).toUpperCase()}</span>
        </div>

        <div className="card-item-row">
          <div className="card-item-info">
            <h4>{product?.title || 'Selected Product'}</h4>
            <p>
              Qty: {quantity || 1} × {formatINR(product?.price || 0)}
            </p>
          </div>
          <div className="card-item-total">{formatINR(total)}</div>
        </div>

        <div className="wallet-balance-row">
          <span>
            Wallet Balance: <strong>{formatINR(walletBalance)}</strong>
          </span>
          <span>
            Balance After Debit: <strong>{formatINR(remainingBalance)}</strong>
          </span>
        </div>

        <div className="policy-note">
          🤖 <strong>Agent Purchase Guarantee:</strong> Protected by relaxed cancellation policy (cancellable through packed status with instant 100% wallet refund).
        </div>

        <button
          type="button"
          className="btn-agent-pay"
          disabled={loading}
          onClick={() => onAction(`Confirm payment for order ${orderId}`)}
        >
          <CheckCircle2 size={16} />
          <span>Authorize {formatINR(total)} & Confirm Order</span>
        </button>
      </div>
    );
  }

  if (card.type === 'WALLET_TOPUP_PROMPT') {
    const { currentBalance, requiredTotal, shortfall } = card.data;
    return (
      <div className="agent-action-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning)' }}>
            <Wallet size={16} />
            <span>Top-Up Required</span>
          </div>
          <span className="order-tag">Balance Low</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)', lineHeight: 1.4 }}>
          Current Wallet Balance: <strong>{formatINR(currentBalance)}</strong>. Required Total: <strong>{formatINR(requiredTotal)}</strong> (short by {formatINR(shortfall)}).
        </div>
        <button
          type="button"
          className="btn-agent-chip-action"
          disabled={loading}
          onClick={() => onAction(`Top up my wallet with ₹${shortfall}`)}
        >
          <Wallet size={14} />
          <span>Add ₹{Number(shortfall).toLocaleString('en-IN')} to Wallet</span>
        </button>
      </div>
    );
  }

  if (card.type === 'WALLET_CARD') {
    const { balance, message } = card.data;
    return (
      <div className="agent-action-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-electric)' }}>
            <Wallet size={16} />
            <span>ShopSphere In-App Wallet</span>
          </div>
          <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--fg-primary)' }}>
            {formatINR(balance)}
          </span>
        </div>
        {message && <div style={{ fontSize: '0.78rem', color: 'var(--fg-muted)' }}>{message}</div>}
        <div className="topup-quick-chips">
          <span className="chip-label">Quick Top Up:</span>
          {[500, 1000, 2000, 5000].map((amt) => (
            <button
              key={amt}
              type="button"
              className="chip-btn"
              disabled={loading}
              onClick={() => onAction(`Top up my wallet with ₹${amt}`)}
            >
              +₹{amt.toLocaleString('en-IN')}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (card.type === 'ORDER_CONFIRMED') {
    const { orderId, total, remainingBalance } = card.data;
    return (
      <div className="agent-action-card order-confirmed-card">
        <div className="confirmed-badge">
          <CheckCircle2 size={16} />
          <span>Order Confirmed & Placed!</span>
        </div>
        <div className="order-details-mini">
          <p>
            Order ID: <strong>#SS-{String(orderId).slice(0, 8).toUpperCase()}</strong>
          </p>
          <p>
            Amount Paid: <strong>{formatINR(total)}</strong> via In-App Wallet
          </p>
          {typeof remainingBalance === 'number' && (
            <p style={{ color: 'var(--fg-muted)' }}>Remaining Wallet Balance: {formatINR(remainingBalance)}</p>
          )}
        </div>
        <div className="agent-policy-pill">
          🤖 <strong>Agent Purchase:</strong> Protected by relaxed cancellation policy. You can cancel with instant 100% wallet refund through packed status.
        </div>
        <Link href="/orders" onClick={onCloseDrawer} className="btn-view-order">
          View in My Orders →
        </Link>
      </div>
    );
  }

  if (card.type === 'ORDER_CANCELLED') {
    const { orderId, refundedAmount, newBalance } = card.data;
    return (
      <div className="agent-action-card">
        <div className="card-header" style={{ color: 'var(--danger)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <XCircle size={16} />
            <span>Order Cancelled</span>
          </div>
          <span className="order-tag">#SS-{String(orderId).slice(0, 6).toUpperCase()}</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--fg-secondary)', lineHeight: 1.4 }}>
          100% refund of <strong>{formatINR(refundedAmount)}</strong> has been credited back to your in-app wallet immediately.
          {typeof newBalance === 'number' && (
            <div style={{ marginTop: '0.25rem', color: 'var(--success)', fontWeight: 600 }}>
              Updated Wallet Balance: {formatINR(newBalance)}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (card.type === 'GIFT_CARD') {
    const { recipient, product, giftMessage, revealDate } = card.data;
    return (
      <div className="agent-action-card gift-preview-card">
        <div className="gift-header">
          <Gift size={16} />
          <span>Surprise Gift Package Configured</span>
        </div>
        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div>
            To: <strong>{recipient}</strong>
          </div>
          {product && (
            <div>
              Product: <strong>{product.title}</strong> ({formatINR(product.price)})
            </div>
          )}
          <div className="gift-message-bubble">&ldquo;{giftMessage}&rdquo;</div>
          {revealDate && <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>Reveal: {revealDate}</span>}
        </div>
        {product && (
          <button
            type="button"
            className="btn-agent-chip-action"
            disabled={loading}
            onClick={() => onAction(`Buy ${product.title} with wallet as gift for ${recipient}`)}
          >
            <Gift size={14} />
            <span>Proceed to Buy Gift with Wallet</span>
          </button>
        )}
      </div>
    );
  }

  if (card.type === 'PRODUCT_CAROUSEL') {
    const products = card.data?.products || [];
    if (products.length === 0) return null;
    return (
      <div className="agent-action-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-electric)' }}>
            <Sparkles size={14} />
            <span>Catalog Items ({products.length})</span>
          </div>
        </div>
        <div className="carousel-items-list">
          {products.slice(0, 4).map((prod: any) => (
            <div key={prod.id} className="carousel-product-item">
              <div className="prod-thumbnail">
                {prod.image_urls?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={prod.image_urls[0]} alt="" />
                )}
              </div>
              <div className="prod-meta">
                <Link href={`/product/${prod.id}`} onClick={onCloseDrawer} className="prod-title">
                  {prod.title}
                </Link>
                <div className="prod-price-row">
                  <span className="price">{formatINR(prod.price)}</span>
                  {prod.average_rating ? (
                    <span className="rating">★ {Number(prod.average_rating).toFixed(1)}</span>
                  ) : null}
                </div>
                <div className="prod-quick-actions">
                  <button
                    type="button"
                    className="quick-btn"
                    disabled={loading}
                    onClick={() => onAction(`Add ${prod.title} to my cart`)}
                    title="Add to Cart"
                  >
                    + Cart
                  </button>
                  <button
                    type="button"
                    className="quick-btn accent"
                    disabled={loading}
                    onClick={() => onAction(`Buy ${prod.title} with wallet`)}
                    title="Buy with Wallet"
                  >
                    ⚡ Buy
                  </button>
                  <button
                    type="button"
                    className="quick-btn fav"
                    disabled={loading}
                    onClick={() => onAction(`Add ${prod.title} to my favorites`)}
                    title="Favorite"
                  >
                    ❤️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card.type === 'REVIEWABLE_LIST') {
    const products = card.data?.products || [];
    return (
      <div className="agent-action-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning)' }}>
            <Star size={15} />
            <span>Review Your Purchases</span>
          </div>
        </div>
        {products.length === 0 ? (
          <div style={{ fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
            No verified purchases eligible for review yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {products.slice(0, 3).map((prod: any) => (
              <div
                key={prod.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.4rem 0.6rem',
                  background: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                  {prod.title}
                </span>
                <button
                  type="button"
                  className="quick-btn accent"
                  disabled={loading}
                  onClick={() => onAction(`Submit a 5-star review for ${prod.title}: Excellent product and fast delivery!`)}
                >
                  ★ 5★ Review
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
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
        "Namaste! I'm your **Customer Super Agent** powered by Gemini. I can perform real shopping actions for you:\n\n• 🔍 **Search & Compare** products across our catalog\n• 🛍️ **Manage Your Cart** (add, update, or clear items)\n• ❤️ **Manage Favorites** with a single command\n• 🎁 **Send Surprise Gifts** to friends with custom notes & scheduled reveals\n• 💰 **In-App Wallet Payments** with 1-tap checkout\n• ⭐ **Write Verified Reviews** on your past purchases\n• 🤖 **Agent Purchases** come with relaxed, lenient cancellation & instant 100% wallet refunds!",
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

      // Dispatch reactive client actions (Cart sync, Favorites sync, Wallet sync)
      if (data.clientActions && Array.isArray(data.clientActions)) {
        for (const act of data.clientActions) {
          if (act.type === 'CART_SYNC') {
            window.dispatchEvent(new CustomEvent('shopsphere:cart-update', { detail: act.payload }));
          } else if (act.type === 'CART_CLEAR') {
            window.dispatchEvent(new CustomEvent('shopsphere:cart-clear', { detail: act.payload }));
          } else if (act.type === 'FAVORITES_SYNC') {
            window.dispatchEvent(
              new CustomEvent('shopsphere:favorites-update', {
                detail: {
                  productId: act.payload.productId,
                  isFavorite: act.payload.action === 'add',
                },
              })
            );
          } else if (act.type === 'WALLET_SYNC') {
            window.dispatchEvent(new CustomEvent('shopsphere:wallet-update', { detail: act.payload }));
          }
        }
      }

      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        recommendedProducts: data.recommendedProducts || [],
        actionCards: data.actionCards || [],
        toolExecutions: data.toolExecutions || [],
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
      const message =
        err instanceof Error
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
        <span>{isOpen ? 'Close AI Guide' : 'Super Agent AI'}</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Customer Super Agent AI Shopping Companion"
          className="ai-assistant-drawer"
        >
          {/* Header */}
          <div className="ai-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Bot size={18} style={{ color: 'var(--accent-electric)' }} />
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--fg-primary)' }}>
                  Customer Super Agent
                </span>
                <span className="section-badge" style={{ fontSize: '0.62rem', padding: '0.1rem 0.45rem' }}>
                  Live Action Agent
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginTop: '0.2rem' }}>
                Catalog search · Cart & Gifting · Wallet 1-tap checkout · Reviewing
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
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.content}</div>

                {/* Render Agent Action Cards (Wallet Pay, Gifting, Order Confirmations, Carousel) */}
                {m.actionCards &&
                  m.actionCards.map((card, idx) => (
                    <ActionCardRenderer
                      key={`${m.id}_card_${idx}`}
                      card={card}
                      onAction={(text) => void handleSendMessage(text)}
                      onCloseDrawer={() => setIsOpen(false)}
                      loading={loading}
                    />
                  ))}

                {/* Legacy Recommended Products fallback */}
                {(!m.actionCards || m.actionCards.length === 0) &&
                  m.recommendedProducts &&
                  m.recommendedProducts.length > 0 && (
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
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-subtle)',
                                overflow: 'hidden',
                                flexShrink: 0,
                              }}
                            >
                              {prod.image_urls?.[0] && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={prod.image_urls[0]}
                                  alt=""
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p
                                style={{
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  color: 'var(--fg-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
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
              <div
                style={{
                  fontSize: '0.8rem',
                  color: 'var(--fg-muted)',
                  fontStyle: 'italic',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem',
                }}
              >
                <Sparkles size={14} className="pulse-badge" /> Super Agent executing actions…
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Prompt Chips */}
          <div className="ai-prompt-chips-row">
            {[
              '💰 Check my wallet',
              '🛍️ View my cart',
              '❤️ Show my favorites',
              '🎁 Send gift to friend',
              '⭐ Review past purchases',
              'Wireless earbuds under ₹2,000',
              'Smartphones under ₹15,000',
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
              placeholder="Ask agent to buy, add to bag, gift friend, or check wallet..."
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
