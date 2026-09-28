'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  Send,
  Wallet,
  Clock,
  Heart,
  TrendingUp,
  ShieldCheck,
  ShoppingBag,
  Star,
  Gift,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import PersonaSelector from '@/components/ai/PersonaSelector';
import type { PersonaConfig } from '@/lib/personas';
import type { UserBehavioralProfile } from '@/services/agent-memory-service';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actionCards?: any[];
  toolExecutions?: any[];
  createdAt?: string;
}

export default function AgentTasksPage() {
  const [profile, setProfile] = useState<UserBehavioralProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [persona, setPersona] = useState<PersonaConfig['id']>('everyday');
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [topupLoading, setTopupLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        `### 👋 Namaste! Welcome to your Autonomous Super Agent Workspace.\n\n` +
        `I am your dedicated AI Shopping Agent powered by Gemini. I continuously learn your shopping preferences, track your dwell time and category interests, and can execute real tasks on your behalf without manual browsing.\n\n` +
        `**What I can do for you:**\n` +
        `- 🎯 **Strict Budget & Category Search:** Tell me any category and price limit (e.g., *"Smartphones under ₹20,000"*). I will strictly honor your constraints.\n` +
        `- ⚡ **1-Tap In-App Wallet Checkout:** Say *"Purchase the first phone for me"* and I will reserve inventory and present instant 1-tap confirmation.\n` +
        `- 🛡️ **Relaxed Lenient Cancellation:** Any order placed through me can be cancelled through the packed stage with an instant 100% wallet refund.\n` +
        `- 🎁 **Surprise Gifting & Reviews:** Send parcels to friends or write verified reviews on delivered orders.\n\n` +
        `Click any **Autonomous Quick Task** on the left or type your command below!`,
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionIdRef = useRef<string>('sess_agent_workspace');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('shopsphere_agent_session_id');
      if (stored) {
        sessionIdRef.current = stored;
      } else {
        const newId = `sess_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('shopsphere_agent_session_id', newId);
        sessionIdRef.current = newId;
      }
    }
  }, []);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await fetchWithCsrf('/api/v1/ai/agent-profile');
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setProfile(data.profile);
        }
        if (Array.isArray(data.conversations) && data.conversations.length > 0) {
          const loaded = data.conversations.map((c: any) => ({
            id: c.id,
            role: c.role,
            content: c.content,
            createdAt: c.created_at,
          }));
          setMessages((prev) => [prev[0], ...loaded]);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch agent profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleWalletUpdate = (e: any) => {
      if (e.detail?.balance !== undefined) {
        setProfile((prev) => (prev ? { ...prev, inAppWalletBalanceINR: e.detail.balance } : null));
      }
    };

    window.addEventListener('shopsphere:wallet-update', handleWalletUpdate);
    return () => {
      window.removeEventListener('shopsphere:wallet-update', handleWalletUpdate);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleQuickTopup = async (amount: number) => {
    try {
      setTopupLoading(true);
      const res = await fetchWithCsrf('/api/v1/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, description: 'Quick Top-up from Agent Command Center' }),
      });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => (prev ? { ...prev, inAppWalletBalanceINR: data.new_balance } : null));
        window.dispatchEvent(new CustomEvent('shopsphere:wallet-update', { detail: { balance: data.new_balance } }));
      }
    } catch (err) {
      console.error('Top-up failed:', err);
    } finally {
      setTopupLoading(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
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
        throw new Error('Failed to get response from Super Agent');
      }

      const data = await res.json();

      // Dispatch Reactive Client Actions
      if (Array.isArray(data.clientActions)) {
        for (const act of data.clientActions) {
          if (act.type === 'CART_SYNC') {
            window.dispatchEvent(new CustomEvent('shopsphere:cart-update', { detail: act.payload }));
          } else if (act.type === 'CART_CLEAR') {
            window.dispatchEvent(new CustomEvent('shopsphere:cart-clear', { detail: act.payload }));
          } else if (act.type === 'FAVORITES_SYNC') {
            window.dispatchEvent(new CustomEvent('shopsphere:favorites-update', { detail: act.payload }));
          } else if (act.type === 'WALLET_SYNC') {
            window.dispatchEvent(new CustomEvent('shopsphere:wallet-update', { detail: act.payload }));
          }
        }
      }

      if (data.behavioralProfile) {
        setProfile(data.behavioralProfile);
      }

      const assistantMsg: ChatMessage = {
        id: `ast_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        actionCards: data.actionCards || [],
        toolExecutions: data.toolExecutions || [],
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error communicating with Super Agent';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Execution Error:** ${msg}. Please try again.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agent-workspace-container">
      {/* Top Intelligence & Behavioral Status Bar */}
      <section className="agent-top-radar">
        <div className="radar-metric">
          <div className="radar-icon-box">
            <Bot size={22} className="text-electric" />
          </div>
          <div className="radar-content">
            <span className="radar-label">Autonomous Super Agent</span>
            <div className="radar-value-row">
              <span className="radar-title">Gemini Multi-Turn ReAct</span>
              <span className="status-live-pill">Live Memory Active</span>
            </div>
          </div>
        </div>

        <div className="radar-metric">
          <div className="radar-icon-box">
            <Clock size={20} />
          </div>
          <div className="radar-content">
            <span className="radar-label">App Usage Tracker</span>
            <span className="radar-main-val">
              {profile ? `~${profile.totalTimeSpentMinutes} mins` : 'Tracking...'}
            </span>
            <small className="radar-subtext">
              {profile ? `${profile.totalSessionsEstimate} active sessions` : 'Measuring dwell time'}
            </small>
          </div>
        </div>

        <div className="radar-metric">
          <div className="radar-icon-box">
            <TrendingUp size={20} />
          </div>
          <div className="radar-content">
            <span className="radar-label">Favorite Category</span>
            <span className="radar-main-val">
              {profile?.topCategories?.[0] ? `${profile.topCategories[0].category}` : 'Electronics'}
            </span>
            <small className="radar-subtext">
              {profile?.topCategories?.[0] ? `${profile.topCategories[0].percentage}% of your browsing` : 'High affinity'}
            </small>
          </div>
        </div>

        <div className="radar-metric wallet-metric-box">
          <div className="radar-icon-box wallet-icon">
            <Wallet size={20} />
          </div>
          <div className="radar-content">
            <span className="radar-label">In-App Digital Wallet</span>
            <span className="radar-main-val text-wallet">
              {formatINR(profile?.inAppWalletBalanceINR || 5000)}
            </span>
            <div className="quick-topup-row">
              <button
                type="button"
                className="chip-topup-mini"
                disabled={topupLoading}
                onClick={() => handleQuickTopup(500)}
              >
                +₹500
              </button>
              <button
                type="button"
                className="chip-topup-mini"
                disabled={topupLoading}
                onClick={() => handleQuickTopup(1000)}
              >
                +₹1,000
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Two-Column Layout */}
      <div className="agent-split-layout">
        {/* Left Column: Memory Deck & 1-Click Autonomous Presets */}
        <aside className="agent-sidebar-deck">
          {/* Persona Switcher */}
          <div className="sidebar-card">
            <h3 className="card-mini-title">
              <Sparkles size={14} /> Agent Persona
            </h3>
            <PersonaSelector value={persona} onChange={setPersona} />
          </div>

          {/* 1-Click Autonomous Tasks */}
          <div className="sidebar-card">
            <h3 className="card-mini-title">
              <Zap size={14} className="text-warning" /> 1-Click Autonomous Tasks
            </h3>
            <p className="card-helper-text">
              Execute agent shopping actions instantly without repetitive typing or extra clicks:
            </p>
            <div className="preset-task-list">
              <button
                type="button"
                className="btn-preset-task"
                disabled={loading}
                onClick={() => handleSendMessage('Search smartphones in Electronics under ₹20,000 for me')}
              >
                <span className="task-emoji">📱</span>
                <div className="task-text">
                  <strong>Phones Under ₹20,000</strong>
                  <small>Strict Electronics filter</small>
                </div>
                <ArrowRight size={14} className="task-arrow" />
              </button>

              <button
                type="button"
                className="btn-preset-task"
                disabled={loading}
                onClick={() => handleSendMessage('Search audio accessories and wireless earbuds under ₹2,000')}
              >
                <span className="task-emoji">🎧</span>
                <div className="task-text">
                  <strong>Earbuds Under ₹2,000</strong>
                  <small>Audio & Accessories category</small>
                </div>
                <ArrowRight size={14} className="task-arrow" />
              </button>

              <button
                type="button"
                className="btn-preset-task"
                disabled={loading}
                onClick={() => handleSendMessage('Show all my favorited products')}
              >
                <span className="task-emoji">❤️</span>
                <div className="task-text">
                  <strong>Inspect My Wishlist</strong>
                  <small>List saved products</small>
                </div>
                <ArrowRight size={14} className="task-arrow" />
              </button>

              <button
                type="button"
                className="btn-preset-task"
                disabled={loading}
                onClick={() => handleSendMessage('What is my current wallet balance and recent activity?')}
              >
                <span className="task-emoji">💰</span>
                <div className="task-text">
                  <strong>Check In-App Wallet</strong>
                  <small>Balance & 1-tap checkout status</small>
                </div>
                <ArrowRight size={14} className="task-arrow" />
              </button>

              <button
                type="button"
                className="btn-preset-task"
                disabled={loading}
                onClick={() => handleSendMessage('Review my delivered orders with verified 5-star ratings')}
              >
                <span className="task-emoji">⭐</span>
                <div className="task-text">
                  <strong>Review Past Purchases</strong>
                  <small>Submit verified buyer reviews</small>
                </div>
                <ArrowRight size={14} className="task-arrow" />
              </button>

              <button
                type="button"
                className="btn-preset-task"
                disabled={loading}
                onClick={() => handleSendMessage('Show friends list so I can send a surprise gift')}
              >
                <span className="task-emoji">🎁</span>
                <div className="task-text">
                  <strong>Send Surprise Gift</strong>
                  <small>Gifting flow with custom reveal</small>
                </div>
                <ArrowRight size={14} className="task-arrow" />
              </button>
            </div>
          </div>

          {/* Behavioral Memory Radar */}
          <div className="sidebar-card">
            <h3 className="card-mini-title">
              <Bot size={14} className="text-electric" /> What Agent Knows About You
            </h3>
            {loadingProfile ? (
              <p className="card-helper-text">Loading behavioral memories...</p>
            ) : profile ? (
              <div className="memory-stats-block">
                <div className="mem-row">
                  <span>Price Tier:</span>
                  <strong>{profile.priceProfile.budgetBracket.toUpperCase()}</strong>
                </div>
                <div className="mem-row">
                  <span>Avg Spend:</span>
                  <strong>{formatINR(profile.priceProfile.averageOrderValueINR)}</strong>
                </div>
                <div className="mem-row">
                  <span>Top Category:</span>
                  <strong>{profile.topCategories[0]?.category || 'Electronics'}</strong>
                </div>
                {profile.wishlistItems.length > 0 && (
                  <div className="mem-wishlist-preview">
                    <span>Wishlisted ({profile.wishlistItems.length}):</span>
                    <ul>
                      {profile.wishlistItems.slice(0, 2).map((item) => (
                        <li key={item.id}>{item.title}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {profile.recentOrders.length > 0 && (
                  <div className="mem-row" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)' }}>
                    <span>Recent Orders:</span>
                    <strong>{profile.recentOrders.length} completed</strong>
                  </div>
                )}
              </div>
            ) : (
              <p className="card-helper-text">Browse products to build your personalized AI profile.</p>
            )}
          </div>
        </aside>

        {/* Right Column: High-Fidelity Agent Action Console */}
        <main className="agent-main-console">
          <div className="console-stream">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`console-bubble ${m.role === 'assistant' ? 'assistant-stream' : 'user-stream'}`}
              >
                <div className="bubble-header">
                  {m.role === 'assistant' ? (
                    <div className="agent-badge-tag">
                      <Bot size={14} />
                      <span>ShopSphere Super Agent</span>
                    </div>
                  ) : (
                    <span className="user-badge-tag">You</span>
                  )}
                </div>

                <div className="bubble-body-content">
                  {/* Clean Formatted Message Renderer */}
                  {m.content.split('\n').map((line, lIdx) => {
                    if (line.startsWith('### ')) {
                      return <h3 key={lIdx} className="fmt-h3">{line.replace('### ', '')}</h3>;
                    }
                    if (line.startsWith('## ')) {
                      return <h2 key={lIdx} className="fmt-h2">{line.replace('## ', '')}</h2>;
                    }
                    if (line.startsWith('- ') || line.startsWith('• ')) {
                      return (
                        <li key={lIdx} className="fmt-li">
                          {renderInlineFormatting(line.slice(2))}
                        </li>
                      );
                    }
                    if (!line.trim()) {
                      return <div key={lIdx} className="fmt-spacer" />;
                    }
                    return <p key={lIdx} className="fmt-p">{renderInlineFormatting(line)}</p>;
                  })}
                </div>

                {/* Render Interactive Action Cards with 1-Tap Frictionless Controls */}
                {m.actionCards && m.actionCards.length > 0 && (
                  <div className="console-action-cards">
                    {m.actionCards.map((card, cIdx) => (
                      <WorkspaceActionCard
                        key={`${m.id}_card_${cIdx}`}
                        card={card}
                        onExecute={(cmd) => void handleSendMessage(cmd)}
                        loading={loading}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="console-loading-indicator">
                <Sparkles size={16} className="animate-spin text-electric" />
                <span>Super Agent executing ReAct multi-turn actions…</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Chips Row */}
          <div className="console-chips-bar">
            {[
              '📱 Buy POCO X4 Pro 5G with wallet',
              '🎧 Add boAt Rockerz 450 to bag',
              '💰 Check wallet balance',
              '⭐ Review my orders',
              '🎁 Gift friend a watch',
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                className="console-chip"
                disabled={loading}
                onClick={() => handleSendMessage(chip)}
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            className="console-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSendMessage();
            }}
          >
            <input
              ref={inputRef}
              type="text"
              className="console-input-field"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask agent: 'Find smartphones under ₹20,000' or 'Buy item with wallet'..."
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-console-send"
              disabled={loading || !inputMessage.trim()}
            >
              <Send size={16} />
              <span>Send Command</span>
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}

/**
 * Inline formatting helper for markdown bold and code spans
 */
function renderInlineFormatting(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index} className="fmt-code">{part.slice(1, -1)}</code>;
    }
    return part;
  });
}

/**
 * Workspace Action Card Component with 1-Tap Frictionless Actions
 */
function WorkspaceActionCard({
  card,
  onExecute,
  loading,
}: {
  card: any;
  onExecute: (cmd: string) => void;
  loading: boolean;
}) {
  if (card.type === 'WALLET_PAY_AUTH') {
    const { orderId, total, product, quantity, walletBalance, remainingBalance } = card.data;
    return (
      <div className="agent-action-card wallet-pay-auth-card">
        <div className="card-header">
          <div className="badge-agent-auth">
            <ShieldCheck size={16} />
            <span>1-Tap Wallet Payment Authorization</span>
          </div>
          <span className="order-tag">Order #SS-{String(orderId).slice(0, 8).toUpperCase()}</span>
        </div>

        <div className="card-item-row">
          <div className="card-item-info">
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>{product?.title || 'Selected Product'}</h4>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>
              Qty: {quantity || 1} · Unit Price: {formatINR(product?.price || 0)}
            </p>
          </div>
          <div className="card-item-total" style={{ fontSize: '1.25rem', fontWeight: 800 }}>
            {formatINR(total)}
          </div>
        </div>

        <div className="wallet-balance-row">
          <span>
            Current Balance: <strong>{formatINR(walletBalance)}</strong>
          </span>
          <span>
            Balance After Debit: <strong>{formatINR(remainingBalance)}</strong>
          </span>
        </div>

        <div className="policy-note">
          🤖 <strong>Lenient AI Agent Guarantee:</strong> You can cancel this order anytime through the <em>packed</em> stage with an instant 100% wallet refund.
        </div>

        <button
          type="button"
          className="btn-agent-pay"
          disabled={loading}
          onClick={() => onExecute(`Confirm payment for order ${orderId}`)}
        >
          <CheckCircle2 size={18} />
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
            <strong style={{ fontSize: '0.9rem' }}>Insufficient Wallet Balance</strong>
          </div>
          <span className="order-tag">Shortfall</span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)', margin: '0.4rem 0' }}>
          Your wallet balance is <strong>{formatINR(currentBalance)}</strong>, but this order requires <strong>{formatINR(requiredTotal)}</strong> (short by {formatINR(shortfall)}).
        </p>
        <button
          type="button"
          className="btn-agent-chip-action"
          disabled={loading}
          onClick={() => onExecute(`Top up my wallet with ₹${shortfall}`)}
        >
          <Wallet size={15} />
          <span>1-Tap Top-Up ₹{Number(shortfall).toLocaleString('en-IN')} to Wallet</span>
        </button>
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
            <Sparkles size={16} />
            <strong style={{ fontSize: '0.9rem' }}>Matched Products ({products.length})</strong>
          </div>
          <span className="order-tag">Strict Filter Applied</span>
        </div>
        <div className="workspace-product-grid">
          {products.slice(0, 4).map((prod: any) => (
            <div key={prod.id} className="workspace-product-card">
              <div className="w-prod-media">
                {prod.image_urls?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={prod.image_urls[0]} alt="" />
                ) : (
                  <div className="w-prod-placeholder" />
                )}
              </div>
              <div className="w-prod-body">
                <Link href={`/product/${prod.id}`} className="w-prod-title">
                  {prod.title}
                </Link>
                <div className="w-prod-price-line">
                  <span className="price">{formatINR(prod.price)}</span>
                  {prod.average_rating ? (
                    <span className="rating">★ {Number(prod.average_rating).toFixed(1)}</span>
                  ) : null}
                </div>
                <div className="w-prod-actions">
                  <button
                    type="button"
                    className="w-action-btn buy"
                    disabled={loading}
                    onClick={() => onExecute(`Buy ${prod.title} with wallet`)}
                    title="1-Tap Buy with Wallet"
                  >
                    ⚡ Buy Now
                  </button>
                  <button
                    type="button"
                    className="w-action-btn cart"
                    disabled={loading}
                    onClick={() => onExecute(`Add ${prod.title} to my cart`)}
                    title="Add to Cart"
                  >
                    + Bag
                  </button>
                  <button
                    type="button"
                    className="w-action-btn fav"
                    disabled={loading}
                    onClick={() => onExecute(`Add ${prod.title} to my favorites`)}
                    title="Bookmark to Wishlist"
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

  if (card.type === 'ORDER_CONFIRMED') {
    const { orderId, total, remainingBalance } = card.data;
    return (
      <div className="agent-action-card order-confirmed-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}>
            <CheckCircle2 size={18} />
            <strong style={{ fontSize: '0.95rem' }}>Order Placed & Confirmed!</strong>
          </div>
          <span className="order-tag">#SS-{String(orderId).slice(0, 8).toUpperCase()}</span>
        </div>
        <p style={{ margin: '0.4rem 0', fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>
          Total of <strong>{formatINR(total)}</strong> paid via in-app wallet. Remaining balance: <strong>{formatINR(remainingBalance)}</strong>.
        </p>
        <div className="policy-note">
          🤖 <strong>Lenient Cancellation Available:</strong> Relaxed cancellation active through <em>packed</em> stage with instant 100% wallet refund.
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem' }}>
          <Link href="/orders" className="btn-agent-chip-action" style={{ textDecoration: 'none' }}>
            <span>View in My Orders</span>
            <ArrowRight size={14} />
          </Link>
          <button
            type="button"
            className="btn-agent-chip-action"
            style={{ background: 'var(--bg-surface)', color: 'var(--fg-muted)' }}
            disabled={loading}
            onClick={() => onExecute(`Cancel order ${orderId}`)}
          >
            Cancel Order
          </button>
        </div>
      </div>
    );
  }

  if (card.type === 'ORDER_CANCELLED') {
    const { orderId, refundedAmount, newBalance } = card.data;
    return (
      <div className="agent-action-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning)' }}>
            <RefreshCw size={16} />
            <strong style={{ fontSize: '0.9rem' }}>Order Cancelled & Refunded</strong>
          </div>
          <span className="order-tag">Refund Credited</span>
        </div>
        <p style={{ margin: '0.4rem 0', fontSize: '0.85rem' }}>
          Order <strong>#SS-{String(orderId).slice(0, 8).toUpperCase()}</strong> cancelled. 100% refund of <strong>{formatINR(refundedAmount)}</strong> has been credited to your in-app wallet!
        </p>
        <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 700 }}>
          New Wallet Balance: {formatINR(newBalance)}
        </span>
      </div>
    );
  }

  return null;
}
