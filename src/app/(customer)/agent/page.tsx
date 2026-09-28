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
  Bell,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import PersonaSelector from '@/components/ai/PersonaSelector';
import type { PersonaConfig } from '@/lib/personas';
import type { UserBehavioralProfile } from '@/services/agent-memory-service';
import { useAgentBackground } from '@/context/AgentBackgroundContext';

export default function AgentTasksPage() {
  const {
    messages,
    setMessages,
    isWorking,
    activeTask,
    notificationPermission,
    requestNotifications,
    submitBackgroundTask,
  } = useAgentBackground();

  const [profile, setProfile] = useState<UserBehavioralProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [persona, setPersona] = useState<PersonaConfig['id']>('everyday');
  const [inputMessage, setInputMessage] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
          setMessages((prev) => (prev.length <= 1 ? [prev[0], ...loaded] : prev));
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

    const handleProfileUpdate = (e: any) => {
      if (e.detail) {
        setProfile(e.detail);
      }
    };

    window.addEventListener('shopsphere:wallet-update', handleWalletUpdate);
    window.addEventListener('shopsphere:profile-update', handleProfileUpdate);
    return () => {
      window.removeEventListener('shopsphere:wallet-update', handleWalletUpdate);
      window.removeEventListener('shopsphere:profile-update', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isWorking]);

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
    if (!text || isWorking) return;
    setInputMessage('');
    await submitBackgroundTask(text, persona);
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

        {/* 5. Background Task Alerts & Cross-Tab Persistence Status */}
        <div className="radar-metric">
          <div className="radar-icon-box">
            <Bell size={20} className={notificationPermission === 'granted' ? 'text-electric' : ''} />
          </div>
          <div className="radar-content">
            <span className="radar-label">Background Task Alerts</span>
            {notificationPermission === 'granted' ? (
              <div className="radar-value-row">
                <span className="radar-main-val" style={{ fontSize: '0.85rem', color: 'var(--success)' }}>
                  Active & Ready
                </span>
                <span className="status-live-pill" style={{ background: 'var(--success-bg)', color: 'var(--success)', borderColor: 'var(--success-border)' }}>
                  Chime + Notify
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="chip-topup-mini"
                style={{
                  width: 'fit-content',
                  marginTop: '0.25rem',
                  background: 'var(--accent-glow)',
                  color: 'var(--accent-electric)',
                  borderColor: 'rgba(79, 70, 229, 0.3)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
                onClick={() => void requestNotifications()}
                title="Enable desktop notifications when tasks complete in background tabs"
              >
                <Bell size={12} />
                <span>Enable Alerts</span>
              </button>
            )}
            <small className="radar-subtext">
              {notificationPermission === 'granted'
                ? 'Alerts when switching tabs'
                : 'Click to enable tab notifications'}
            </small>
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
                disabled={isWorking}
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
                disabled={isWorking}
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
                disabled={isWorking}
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
                disabled={isWorking}
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
                disabled={isWorking}
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
                disabled={isWorking}
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
          {/* Background Working Status Notice Bar */}
          {isWorking && (
            <div className="agent-working-notice-bar" role="status" aria-live="polite">
              <span className="pulse-dot" style={{ color: 'var(--accent-electric)', fontSize: '1.25rem', lineHeight: 1 }}>●</span>
              <div style={{ flex: 1 }}>
                <strong>Agent executing in background:</strong> &ldquo;{activeTask?.prompt || 'Autonomous ReAct reasoning'}&rdquo;
              </div>
              <small>Feel free to switch tabs or browse other pages; you will receive a chime & desktop alert upon completion.</small>
            </div>
          )}

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
                        loading={isWorking}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isWorking && (
              <div className="console-loading-indicator">
                <Sparkles size={16} className="animate-spin text-electric" />
                <span>Super Agent executing ReAct multi-turn actions in background…</span>
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
                disabled={isWorking}
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
              disabled={isWorking}
            />
            <button
              type="submit"
              className="btn-console-send"
              disabled={isWorking || !inputMessage.trim()}
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
