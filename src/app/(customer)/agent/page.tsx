'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  Send,
  Wallet,
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
  Plus,
  Trash2,
  History,
  MessageSquare,
  CreditCard,
  Building2,
  QrCode,
  Tag,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import PersonaSelector from '@/components/ai/PersonaSelector';
import type { PersonaConfig } from '@/lib/personas';
import type { UserBehavioralProfile } from '@/services/agent-memory-service';
import { useAgentBackground, type AgentChatSession } from '@/context/AgentBackgroundContext';
import FormattedMessage from '@/components/ui/FormattedMessage';

export default function AgentTasksPage() {
  const {
    messages,
    setMessages,
    sessionId,
    sessions,
    switchSession,
    createNewSession,
    deleteSession,
    isWorking,
    activeTask,
    notificationPermission,
    requestNotifications,
    submitBackgroundTask,
    mode,
    setMode,
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
    await submitBackgroundTask(text, persona, mode);
  };

  const sessionGroups = React.useMemo(() => {
    const today: AgentChatSession[] = [];
    const yesterday: AgentChatSession[] = [];
    const past7Days: AgentChatSession[] = [];
    const older: AgentChatSession[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
    const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

    for (const s of sessions) {
      const t = new Date(s.updatedAt || s.createdAt).getTime();
      if (t >= startOfToday) {
        today.push(s);
      } else if (t >= startOfYesterday) {
        yesterday.push(s);
      } else if (t >= startOf7Days) {
        past7Days.push(s);
      } else {
        older.push(s);
      }
    }

    return { today, yesterday, past7Days, older };
  }, [sessions]);

  const renderSessionGroup = (label: string, list: AgentChatSession[]) => {
    if (!list || list.length === 0) return null;
    return (
      <div className="session-group-section" key={label}>
        <div className="session-group-title">{label}</div>
        {list.map((s) => {
          const isActive = s.id === sessionId;
          return (
            <div
              key={s.id}
              className={`session-item-row ${isActive ? 'active' : ''}`}
              onClick={() => void switchSession(s.id)}
              role="button"
              tabIndex={0}
              title={`Switch to "${s.title}"`}
            >
              <div className="session-item-main">
                <span className="session-item-title">
                  {s.title || 'Shopping Conversation'}
                </span>
                <span className="session-item-snippet">
                  {s.lastMessage || 'Recent chat'}
                </span>
              </div>
              <button
                type="button"
                className="session-delete-btn"
                title="Delete this chat"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteSession(s.id);
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="agent-workspace-container">
      {/* Compact status: wallet, taste, and alerts stay reachable without a tall dashboard */}
      <section className="agent-top-radar agent-status-strip">
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
        {/* Left Column: Chat History, Memory Deck & 1-Click Autonomous Presets */}
        <aside className="agent-sidebar-deck">
          {/* ChatGPT / Gemini Style Chat History & Sessions */}
          <div className="agent-history-card">
            <button
              type="button"
              className="btn-new-chat"
              onClick={createNewSession}
              title="Start a fresh conversation thread"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>

            <div
              className="sessions-header-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.2rem 0.25rem 0',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'var(--fg-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <History size={13} />
                <span>Chat History</span>
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>
                {sessions.length} {sessions.length === 1 ? 'chat' : 'chats'}
              </span>
            </div>

            <div className="sessions-scroll-container">
              {sessions.length === 0 ? (
                <div className="session-empty-state">
                  <span>No past chat threads yet. Messages will be saved automatically as you chat!</span>
                </div>
              ) : (
                <>
                  {renderSessionGroup('Today', sessionGroups.today)}
                  {renderSessionGroup('Yesterday', sessionGroups.yesterday)}
                  {renderSessionGroup('Previous 7 Days', sessionGroups.past7Days)}
                  {renderSessionGroup('Older', sessionGroups.older)}
                </>
              )}
            </div>
          </div>

          <div className="sidebar-card agent-you-card">
            <h3 className="card-mini-title">
              <Sparkles size={14} /> Your agent
            </h3>
            <PersonaSelector variant="wrap" value={persona} onChange={setPersona} />
            <div className="agent-you-divider" />
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
          {/* Thread Header */}
          <div
            className="console-thread-header"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1.25rem',
              borderBottom: '1px solid var(--border-subtle)',
              background: 'var(--bg-canvas)',
              flexWrap: 'wrap',
              gap: '0.65rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
              <MessageSquare size={16} className="text-electric" style={{ flexShrink: 0 }} />
              <span
                style={{
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--fg-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '240px',
                }}
              >
                {sessions.find((s) => s.id === sessionId)?.title || 'Current Shopping Session'}
              </span>
              <span className="status-live-pill" style={{ fontSize: '0.65rem', padding: '0.1rem 0.45rem' }}>
                {messages.length - 1 <= 0 ? 'Fresh Thread' : `${messages.length - 1} turns`}
              </span>
            </div>

            {/* Mode Switcher Toggle Pill */}
            <div className="ai-mode-toggle-bar" style={{ margin: 0 }}>
              <button
                type="button"
                className={`ai-mode-btn ${mode === 'chat' ? 'active' : ''}`}
                onClick={() => setMode('chat')}
                title="Chat Mode: Conversational shopping consultations, styling advice & product questions"
              >
                <MessageSquare size={13} />
                <span>💬 Chat Mode</span>
              </button>
              <button
                type="button"
                className={`ai-mode-btn ${mode === 'agent' ? 'active agent-active' : ''}`}
                onClick={() => setMode('agent')}
                title="Agent Mode: Autonomous tasks, bag mutations, 1-tap checkout & relaxed cancellation"
              >
                <Zap size={13} />
                <span>⚡ Agent Mode</span>
              </button>
            </div>

          </div>

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
                <div className="bubble-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {m.role === 'assistant' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div className="agent-badge-tag">
                        <Bot size={14} />
                        <span>{m.mode === 'chat' ? 'ShopSphere Shopping Guide' : 'ShopSphere Super Agent'}</span>
                      </div>
                      <span className={`ai-mode-indicator-chip ${m.mode || mode}`}>
                        {m.mode === 'chat' ? '💬 Chat' : '⚡ Agent'}
                      </span>
                    </div>
                  ) : (
                    <span className="user-badge-tag">You</span>
                  )}
                  {m.role === 'assistant' && m.provenance && (
                    <div className="ai-provenance-badge">
                      <ShieldCheck size={11} />
                      <span>{m.provenance.source} · {m.provenance.rowCount} verified items</span>
                    </div>
                  )}
                </div>

                <div className="bubble-body-content">
                  <FormattedMessage content={m.content} isUser={m.role === 'user'} />
                </div>

                {/* Interactive Quick Reply Suggestion Chips */}
                {m.role === 'assistant' && m.quickReplies && m.quickReplies.length > 0 && (
                  <div className="ai-quick-replies-container">
                    <span className="quick-replies-label">Suggested replies / options:</span>
                    <div className="quick-replies-pills">
                      {m.quickReplies.map((qr, qidx) => (
                        <button
                          key={qidx}
                          type="button"
                          className="ai-quick-reply-pill"
                          disabled={isWorking}
                          onClick={() => {
                            if (qr.includes('Switch to Agent Mode')) {
                              setMode('agent');
                            }
                            void handleSendMessage(qr);
                          }}
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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

          <div className="console-composer">
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
              placeholder={
                mode === 'chat'
                  ? "Ask anything: 'Recommend casual shoes under ₹2,000', 'Compare Noise & Boat watches'..."
                  : "Ask agent: 'Find smartphones under ₹20,000' or 'Buy item with wallet'..."
              }
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
          </div>
        </main>
      </div>
    </div>
  );
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
    const { orderId, total, subtotal, discount, product, quantity, walletBalance, remainingBalance, appliedOffer, availableOffers } = card.data;
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

        {/* Applied Coupon Info if active */}
        {appliedOffer && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0.65rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--success)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
              <Tag size={14} />
              <span>Coupon {appliedOffer.code} Applied</span>
            </div>
            <strong style={{ fontWeight: 800 }}>-{formatINR(appliedOffer.discountAmount || discount || 0)}</strong>
          </div>
        )}

        {/* Available Wallet-Compatible Offers to select (Strict Rule: Zero auto-apply) */}
        {!appliedOffer && availableOffers && availableOffers.length > 0 && (
          <div style={{ margin: '0.2rem 0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--fg-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Tag size={13} style={{ color: 'var(--accent-electric)' }} />
              <span>Available Wallet Offers (Tap to apply):</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {availableOffers.map((offer: any) => (
                <button
                  key={offer.code}
                  type="button"
                  disabled={loading}
                  onClick={() => onExecute(`Apply coupon ${offer.code} to order ${orderId}`)}
                  className="btn-agent-chip-action"
                  style={{
                    background: 'rgba(79, 70, 229, 0.08)',
                    border: '1px dashed var(--accent-electric)',
                    color: 'var(--accent-electric)',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  title={offer.description}
                >
                  🏷️ Apply {offer.code} (-{formatINR(offer.discountAmount)})
                </button>
              ))}
            </div>
          </div>
        )}

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
    const { currentBalance, requiredTotal, shortfall, availableOffers, appliedOffer, product } = card.data;
    return (
      <div className="agent-action-card" style={{ border: '1.5px solid rgba(245, 158, 11, 0.4)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--warning)' }}>
            <Wallet size={16} />
            <strong style={{ fontSize: '0.9rem' }}>Insufficient Wallet Balance</strong>
          </div>
          <span className="order-tag" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', fontWeight: 700 }}>
            Shortfall: {formatINR(shortfall)}
          </span>
        </div>
        <p style={{ fontSize: '0.85rem', color: 'var(--fg-secondary)', margin: '0.2rem 0' }}>
          Your in-app wallet balance is <strong>{formatINR(currentBalance)}</strong>, but this order requires <strong>{formatINR(requiredTotal)}</strong>.
        </p>

        {/* Optional offer chips to reduce total before topping up */}
        {!appliedOffer && availableOffers && availableOffers.length > 0 && (
          <div style={{ padding: '0.4rem 0.5rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)', margin: '0.2rem 0' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
              💡 Or apply a wallet offer to lower your shortfall:
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {availableOffers.map((offer: any) => (
                <button
                  key={offer.code}
                  type="button"
                  disabled={loading}
                  onClick={() => onExecute(product ? `Buy ${product.title} with coupon ${offer.code}` : `Apply coupon ${offer.code}`)}
                  className="btn-agent-chip-action"
                  style={{
                    background: 'var(--accent-glow)',
                    color: 'var(--accent-electric)',
                    fontSize: '0.72rem',
                    padding: '0.2rem 0.5rem',
                    fontWeight: 600,
                  }}
                >
                  🏷️ {offer.code} (-{formatINR(offer.discountAmount)})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Multi-Option Top-Up Methods (Card, UPI, Bank) */}
        <div style={{ marginTop: '0.35rem' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--fg-primary)', marginBottom: '0.45rem' }}>
            Choose Top-Up Payment Method:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
            {/* 1. Instant UPI */}
            <button
              type="button"
              className="btn-agent-chip-action"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.6rem 0.75rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                gap: '0.25rem',
                cursor: 'pointer',
              }}
              disabled={loading}
              onClick={() => onExecute(`Top up my wallet with ₹${shortfall} via UPI`)}
              title="Top up using Google Pay, PhonePe, Paytm, or BHIM"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-electric)', fontWeight: 700, fontSize: '0.82rem' }}>
                <QrCode size={15} />
                <span>Instant UPI</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>GPay · PhonePe · Paytm</span>
              <strong style={{ fontSize: '0.8rem', color: 'var(--fg-primary)', marginTop: '0.15rem' }}>+ ₹{Number(shortfall).toLocaleString('en-IN')}</strong>
            </button>

            {/* 2. Credit / Debit Card */}
            <button
              type="button"
              className="btn-agent-chip-action"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.6rem 0.75rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                gap: '0.25rem',
                cursor: 'pointer',
              }}
              disabled={loading}
              onClick={() => onExecute(`Top up my wallet with ₹${shortfall} via Card`)}
              title="Top up using Visa, Mastercard, or RuPay card"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-electric)', fontWeight: 700, fontSize: '0.82rem' }}>
                <CreditCard size={15} />
                <span>Credit / Debit Card</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>Visa · RuPay · MC</span>
              <strong style={{ fontSize: '0.8rem', color: 'var(--fg-primary)', marginTop: '0.15rem' }}>+ ₹{Number(shortfall).toLocaleString('en-IN')}</strong>
            </button>

            {/* 3. Net Banking */}
            <button
              type="button"
              className="btn-agent-chip-action"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                padding: '0.6rem 0.75rem',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'left',
                gap: '0.25rem',
                cursor: 'pointer',
              }}
              disabled={loading}
              onClick={() => onExecute(`Top up my wallet with ₹${shortfall} via Net Banking`)}
              title="Top up using Net Banking (SBI, HDFC, ICICI, Axis)"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--accent-electric)', fontWeight: 700, fontSize: '0.82rem' }}>
                <Building2 size={15} />
                <span>Net Banking</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>SBI · HDFC · ICICI</span>
              <strong style={{ fontSize: '0.8rem', color: 'var(--fg-primary)', marginTop: '0.15rem' }}>+ ₹{Number(shortfall).toLocaleString('en-IN')}</strong>
            </button>
          </div>
        </div>

        <div style={{ fontSize: '0.72rem', color: 'var(--fg-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem' }}>
          <span>💡 Once top-up is completed, return to the agent to finalize and authorize your order.</span>
        </div>
      </div>
    );
  }

  if (card.type === 'WALLET_TOPUP_SUCCESS') {
    const { creditedAmount, paymentMethod, newBalance, pendingOrderId, pendingOrderTotal } = card.data;
    return (
      <div className="agent-action-card" style={{ border: '1.5px solid rgba(16, 185, 129, 0.4)' }}>
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}>
            <CheckCircle2 size={18} />
            <strong style={{ fontSize: '0.95rem' }}>Wallet Top-Up Completed</strong>
          </div>
          <span className="order-tag" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', fontWeight: 700 }}>
            +{formatINR(creditedAmount)}
          </span>
        </div>
        <p style={{ margin: '0.3rem 0', fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>
          Credited <strong>{formatINR(creditedAmount)}</strong> via <strong>{paymentMethod}</strong>. Your updated wallet balance is <strong>{formatINR(newBalance)}</strong>.
        </p>

        {pendingOrderId ? (
          <div style={{ padding: '0.6rem', background: 'rgba(79, 70, 229, 0.06)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(79, 70, 229, 0.2)', marginTop: '0.3rem' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--fg-primary)', marginBottom: '0.2rem' }}>
              Order #SS-{String(pendingOrderId).slice(0, 8).toUpperCase()} is ready!
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--fg-muted)', marginBottom: '0.5rem' }}>
              Your wallet balance now satisfies this order requirement. You can authorize payment now.
            </div>
            <button
              type="button"
              className="btn-agent-pay"
              disabled={loading}
              onClick={() => onExecute(`Confirm payment for order ${pendingOrderId}`)}
            >
              <CheckCircle2 size={16} />
              <span>Return & Authorize Payment ({formatINR(pendingOrderTotal || creditedAmount)})</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-agent-chip-action"
            style={{ background: 'var(--accent-primary)', color: '#fff', alignSelf: 'flex-start', marginTop: '0.3rem' }}
            disabled={loading}
            onClick={() => onExecute('Show my recommendations')}
          >
            <span>Proceed to Shopping</span>
            <ArrowRight size={14} />
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
    const { orderId, total, remainingBalance, isGift, recipient } = card.data;
    return (
      <div className="agent-action-card order-confirmed-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--success)' }}>
            <CheckCircle2 size={18} />
            <strong style={{ fontSize: '0.95rem' }}>{isGift ? '🎁 Gift Placed & Confirmed!' : 'Order Placed & Confirmed!'}</strong>
          </div>
          <span className="order-tag">#SS-{String(orderId).slice(0, 8).toUpperCase()}</span>
        </div>
        {isGift && (
          <div style={{ padding: '0.45rem 0.65rem', background: 'var(--accent-glow)', borderRadius: 'var(--radius-sm)', fontSize: '0.825rem', color: 'var(--accent-electric)', marginBottom: '0.5rem', fontWeight: 600 }}>
            🎁 Surprise gift sent to: <strong>{recipient}</strong>
          </div>
        )}
        <p style={{ margin: '0.4rem 0', fontSize: '0.85rem', color: 'var(--fg-secondary)' }}>
          Total of <strong>{formatINR(total)}</strong> paid via in-app wallet. Remaining balance: <strong>{formatINR(remainingBalance)}</strong>.
        </p>
        <div className="policy-note">
          🤖 <strong>Lenient Cancellation Available:</strong> Relaxed cancellation active through <em>packed</em> stage with instant 100% wallet refund.
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
          <Link href="/orders" className="btn-agent-chip-action" style={{ textDecoration: 'none' }}>
            <span>View in My Orders</span>
            <ArrowRight size={14} />
          </Link>
          {isGift && (
            <Link href="/gifts" className="btn-agent-chip-action" style={{ textDecoration: 'none', background: 'var(--accent-glow)', color: 'var(--accent-electric)' }}>
              <span>View in Gifting Hub</span>
              <Gift size={14} />
            </Link>
          )}
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

  if (card.type === 'GIFT_CARD') {
    const { recipient, product, giftMessage, revealDate, orderId, total, appliedOffer, availableOffers } = card.data;
    return (
      <div className="agent-action-card gift-preview-card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-electric)' }}>
            <Gift size={18} />
            <strong style={{ fontSize: '0.95rem' }}>Surprise Gift Package Configured</strong>
          </div>
          {orderId && <span className="order-tag">#SS-{String(orderId).slice(0, 8).toUpperCase()}</span>}
        </div>
        <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: '0.5rem 0' }}>
          <div>To: <strong>{recipient}</strong></div>
          {product && (
            <div>Product: <strong>{product.title}</strong> ({formatINR(product.price)})</div>
          )}
          <div style={{ padding: '0.4rem 0.6rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border-subtle)', fontStyle: 'italic', fontSize: '0.8rem' }}>
            &ldquo;{giftMessage || 'A special gift for you!'}&rdquo;
          </div>
          {revealDate && <span style={{ fontSize: '0.72rem', color: 'var(--fg-muted)' }}>Reveal: {revealDate}</span>}

          {/* Applied Coupon Info */}
          {appliedOffer && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.55rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--success)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700 }}>
                <Tag size={13} />
                <span>Coupon {appliedOffer.code} Applied</span>
              </div>
              <strong style={{ fontWeight: 800 }}>-{formatINR(appliedOffer.discountAmount)}</strong>
            </div>
          )}

          {/* Available Gifting Offers (User choice) */}
          {!appliedOffer && availableOffers && availableOffers.length > 0 && (
            <div style={{ margin: '0.2rem 0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--fg-secondary)', marginBottom: '0.25rem' }}>
                🏷️ Available Offers for this Gift:
              </div>
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {availableOffers.map((offer: any) => (
                  <button
                    key={offer.code}
                    type="button"
                    disabled={loading}
                    onClick={() => onExecute(`Apply coupon ${offer.code}${orderId ? ` to order ${orderId}` : ''}`)}
                    className="btn-agent-chip-action"
                    style={{
                      background: 'rgba(79, 70, 229, 0.08)',
                      border: '1px dashed var(--accent-electric)',
                      color: 'var(--accent-electric)',
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      fontWeight: 700,
                    }}
                  >
                    🏷️ Apply {offer.code} (-{formatINR(offer.discountAmount)})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-agent-chip-action"
            style={{ background: 'var(--accent-primary)', color: '#fff' }}
            disabled={loading}
            onClick={() => onExecute(orderId ? `Confirm payment for order ${orderId}` : `Send ${product?.title || 'gift'} to ${recipient}`)}
          >
            <CheckCircle2 size={14} />
            <span>Authorize & Dispatch Gift ({formatINR(total || product?.price || 0)})</span>
          </button>
          <Link href="/gifts" className="btn-agent-chip-action" style={{ textDecoration: 'none' }}>
            <span>Gifting Hub</span>
          </Link>
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
