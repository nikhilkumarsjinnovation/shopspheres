'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  Brain,
  Sparkles,
  Send,
  RefreshCw,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  Package,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Store,
  Layers,
  Search,
  MessageSquare,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import { fetchWithCsrf } from '@/lib/csrf-client';
import type { TenantLearningStats, ProductKnowledgeNode, GracePeriodItem } from '@/services/rag-service';
import FormattedMessage from '@/components/ui/FormattedMessage';

export interface RagChatInterfaceProps {
  role: 'admin' | 'seller';
  initialShopName?: string;
  adminShops?: Array<{ id: string; name: string }>;
}

interface ChatSessionItem {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isPersonalized?: boolean;
  matchedNodes?: ProductKnowledgeNode[];
  createdAt?: string;
  provenance?: {
    verifiedAt: string;
    source: string;
    nodesRetrieved: number;
    tenantScope: string;
  };
}

export default function RagChatInterface({ role, initialShopName, adminShops = [] }: RagChatInterfaceProps) {
  // Chat state
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // RAG & Mode state
  const [isPersonalized, setIsPersonalized] = useState<boolean>(true);
  const [stats, setStats] = useState<TenantLearningStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Admin shop selection
  const [selectedShopId, setSelectedShopId] = useState<string>('');

  // Modals & Drawers
  const [showGraceModal, setShowGraceModal] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Expanded nodes per message
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeShopName = role === 'admin'
    ? (selectedShopId ? adminShops.find((s) => s.id === selectedShopId)?.name || 'Selected Shop' : 'Entire Platform Database')
    : (initialShopName || 'My Store');

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Fetch learning stats
  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const url = role === 'admin' && selectedShopId
        ? `/api/v1/ai/rag/status?shopId=${selectedShopId}`
        : '/api/v1/ai/rag/status';
      const res = await fetchWithCsrf(url);
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch RAG stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [role, selectedShopId]);

  // Fetch sessions
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetchWithCsrf('/api/v1/ai/conversations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          setSessions(data.sessions);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch chat sessions:', err);
    }
  }, []);

  // Initialize session
  useEffect(() => {
    const storedSession = localStorage.getItem(`shopsphere_rag_session_${role}`);
    const initialSession = storedSession || `rag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(initialSession);
    if (!storedSession) {
      localStorage.setItem(`shopsphere_rag_session_${role}`, initialSession);
    }
    fetchStats();
    fetchSessions();
  }, [role, fetchStats, fetchSessions]);

  // Load active session messages
  useEffect(() => {
    if (!sessionId) return;
    async function loadSessionTurns() {
      try {
        const res = await fetchWithCsrf(`/api/v1/ai/conversations?sessionId=${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.messages) && data.messages.length > 0) {
            setMessages(
              data.messages.map((m: any) => ({
                id: m.id || String(Math.random()),
                role: m.role,
                content: m.content,
                createdAt: m.createdAt,
                isPersonalized: true,
                matchedNodes: m.recommendedProducts,
              }))
            );
            return;
          }
        }
      } catch (err) {
        console.warn('Failed to load session messages:', err);
      }

      // Default welcome message if fresh session
      const welcome: MessageItem = {
        id: 'welcome-rag',
        role: 'assistant',
        content: `### 🧠 Welcome to ShopSphere Store Intelligence AI

I am your dedicated store copilot for **${activeShopName}**.

- **⚡ Personalized RAG Mode (ON):** I retrieve your store's private product embeddings, stock figures, and catalog specs in real-time to answer with exact inventory accuracy.
- **💬 Normal Chat Mode (OFF):** Standard conversational assistant for merchant strategy, copywriting, email templates, and general retail Q&A.
- **🛡️ Multi-Tenant Privacy Guarantee:** Your store's catalog is strictly isolated. No data is shared with or leaked to any other merchants.
- **♻️ 1-Week Soft Deletion Grace Period:** Deleted products retain their RAG embeddings for 7 days so you can recover them anytime without re-learning.

What would you like to explore or analyze today?`,
        isPersonalized: true,
      };
      setMessages([welcome]);
    }

    loadSessionTurns();
  }, [sessionId, activeShopName]);

  // Handle Switch Session
  const handleSwitchSession = (sid: string) => {
    setSessionId(sid);
    localStorage.setItem(`shopsphere_rag_session_${role}`, sid);
  };

  // Handle New Session
  const handleNewSession = () => {
    const newSid = `rag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setSessionId(newSid);
    localStorage.setItem(`shopsphere_rag_session_${role}`, newSid);
    setMessages([]);
  };

  // Handle Delete Session
  const handleDeleteSession = async (e: React.MouseEvent, sid: string) => {
    e.stopPropagation();
    try {
      await fetchWithCsrf(`/api/v1/ai/conversations?sessionId=${sid}`, {
        method: 'DELETE',
      });
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      if (sessionId === sid) {
        handleNewSession();
      }
    } catch (err) {
      console.warn('Failed to delete session:', err);
    }
  };

  // Handle Knowledge Sync (Self-Learning)
  const handleSyncKnowledge = async () => {
    try {
      setIsSyncing(true);
      setSyncFeedback(null);
      const res = await fetchWithCsrf('/api/v1/ai/rag/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: selectedShopId || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setSyncFeedback(data.message || 'Knowledge base successfully synced.');
        if (data.stats) {
          setStats(data.stats);
        }
      } else {
        setSyncFeedback('Sync encountered an issue. Check connection.');
      }
    } catch (err) {
      setSyncFeedback('Sync failed. Please retry.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Handle Restore Soft-Deleted Product
  const handleRestoreProduct = async (productId: string) => {
    try {
      setRestoringId(productId);
      const res = await fetchWithCsrf('/api/v1/ai/rag/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        const data = await res.json();
        setActionSuccess(data.message || 'Product restored successfully!');
        fetchStats();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to restore product');
      }
    } catch (err) {
      alert('Network error restoring product');
    } finally {
      setRestoringId(null);
      setTimeout(() => setActionSuccess(null), 5000);
    }
  };

  // Send message
  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    const userTurn: MessageItem = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userTurn]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const historyPayload = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetchWithCsrf('/api/v1/ai/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend.trim(),
          isPersonalized,
          sessionId,
          targetShopId: selectedShopId || null,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Server error.');
      }

      const data = await res.json();
      const botTurn: MessageItem = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        isPersonalized: data.isPersonalized,
        matchedNodes: data.matchedNodes,
        provenance: data.provenance,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botTurn]);
      fetchSessions();
      fetchStats();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Error communicating with AI engine';
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Error:** ${errMsg}. Please verify settings or retry.`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const toggleNodeExpansion = (msgId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  return (
    <div className="rag-workspace-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* 1. TOP HEADER & RAG CONTROLS */}
      <div
        className="card-portal"
        style={{
          padding: '1.25rem 1.5rem',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-canvas)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: isPersonalized ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'var(--bg-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow: isPersonalized ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Brain size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {activeShopName}
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.5rem',
                      borderRadius: '999px',
                      background: isPersonalized ? 'rgba(139, 92, 246, 0.12)' : 'var(--bg-muted)',
                      color: isPersonalized ? '#8b5cf6' : 'var(--fg-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {isPersonalized ? 'Personalized RAG' : 'Standard Chat'}
                  </span>
                </h2>
                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.825rem', color: 'var(--fg-muted)' }}>
                  {isPersonalized
                    ? 'Strictly isolated store embeddings · Multi-turn memory · Zero cross-shop leakage'
                    : 'Conversational LLM for general business strategy & copywriting without store grounding'}
                </p>
              </div>
            </div>
          </div>

          {/* Right Side: Admin Shop Picker & Toggle Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            {role === 'admin' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Store size={15} style={{ color: 'var(--fg-muted)' }} />
                <select
                  value={selectedShopId}
                  onChange={(e) => {
                    setSelectedShopId(e.target.value);
                  }}
                  style={{
                    padding: '0.45rem 0.8rem',
                    fontSize: '0.825rem',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-canvas)',
                    color: 'var(--fg-primary)',
                    fontWeight: 600,
                  }}
                >
                  <option value="">🌐 Full Platform Catalog (All Shops)</option>
                  {adminShops.map((s) => (
                    <option key={s.id} value={s.id}>
                      🏪 {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Mode Toggle Switch */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                background: 'var(--bg-muted)',
                padding: '0.25rem',
                borderRadius: '999px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <button
                type="button"
                onClick={() => setIsPersonalized(false)}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.785rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  background: !isPersonalized ? 'var(--bg-canvas)' : 'transparent',
                  color: !isPersonalized ? 'var(--fg-primary)' : 'var(--fg-muted)',
                  boxShadow: !isPersonalized ? 'var(--shadow-xs)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                💬 Normal Chat
              </button>
              <button
                type="button"
                onClick={() => setIsPersonalized(true)}
                style={{
                  padding: '0.35rem 0.85rem',
                  fontSize: '0.785rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  background: isPersonalized ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'transparent',
                  color: isPersonalized ? '#ffffff' : 'var(--fg-muted)',
                  boxShadow: isPersonalized ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Sparkles size={13} />
                Personalized RAG
              </button>
            </div>
          </div>
        </div>

        {/* 2. LEARNING METRICS & STATUS BAR */}
        <div
          style={{
            marginTop: '1.25rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
        >
          {/* Learning Progress Gauge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ minWidth: '180px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.3rem' }}>
                <span style={{ color: 'var(--fg-secondary)' }}>Knowledge Base Learned:</span>
                <span style={{ color: (stats?.learningPercentage ?? 100) >= 100 ? '#10b981' : '#8b5cf6' }}>
                  {loadingStats ? '...' : `${stats?.learningPercentage ?? 100}%`}
                </span>
              </div>
              <div style={{ height: '6px', width: '100%', background: 'var(--bg-muted)', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${stats?.learningPercentage ?? 100}%`,
                    background: (stats?.learningPercentage ?? 100) >= 100 ? '#10b981' : 'linear-gradient(90deg, #8b5cf6, #3b82f6)',
                    transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', color: 'var(--fg-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', background: 'var(--bg-muted)', borderRadius: 'var(--radius-sm)' }}>
                <Package size={13} style={{ color: '#10b981' }} />
                <strong>{stats?.learnedProducts ?? 0}</strong> Learned Nodes
              </span>
              {(stats?.pendingProducts ?? 0) > 0 && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.5rem', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderRadius: 'var(--radius-sm)' }}>
                  <AlertTriangle size={13} />
                  <strong>{stats?.pendingProducts}</strong> Pending
                </span>
              )}
              {(stats?.gracePeriodProducts ?? 0) > 0 && (
                <button
                  type="button"
                  onClick={() => setShowGraceModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.55rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Clock size={13} />
                  <strong>{stats?.gracePeriodProducts}</strong> in 7-Day Grace Period
                </button>
              )}
            </div>
          </div>

          {/* Sync Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            {syncFeedback && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>{syncFeedback}</span>
            )}
            {actionSuccess && (
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#10b981' }}>{actionSuccess}</span>
            )}
            <button
              type="button"
              onClick={handleSyncKnowledge}
              disabled={isSyncing}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.9rem',
                fontSize: '0.785rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-default)',
                color: 'var(--fg-primary)',
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition-fast)',
              }}
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? 'Learning Products...' : 'Sync Knowledge Base'}
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: SESSIONS SIDEBAR + CHAT CANVAS */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '1.25rem', minHeight: '620px' }}>
        {/* Left: Chat Sessions List */}
        <div
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-muted)' }}>
              Chat Sessions
            </span>
            <button
              type="button"
              onClick={handleNewSession}
              style={{
                padding: '0.3rem 0.6rem',
                fontSize: '0.75rem',
                fontWeight: 700,
                borderRadius: 'var(--radius-sm)',
                background: 'var(--fg-primary)',
                color: 'var(--bg-canvas)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <Plus size={13} /> New Chat
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', flex: 1, maxHeight: '530px' }}>
            {sessions.length === 0 ? (
              <div style={{ padding: '1rem 0.5rem', textAlign: 'center', color: 'var(--fg-muted)', fontSize: '0.8rem' }}>
                No saved sessions yet. Type a question to begin.
              </div>
            ) : (
              sessions.map((s) => {
                const isActive = s.id === sessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSwitchSession(s.id)}
                    style={{
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: isActive ? 'var(--bg-muted)' : 'transparent',
                      border: isActive ? '1px solid var(--border-default)' : '1px solid transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '0.5rem' }}>
                      <p style={{ margin: 0, fontSize: '0.825rem', fontWeight: isActive ? 700 : 500, color: 'var(--fg-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.title}
                      </p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--fg-muted)' }}>
                        {new Date(s.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteSession(e, s.id)}
                      title="Delete Session"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--fg-muted)',
                        cursor: 'pointer',
                        padding: '0.2rem',
                        borderRadius: '4px',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Interactive Chat Canvas */}
        <div
          style={{
            background: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
          }}
        >
          {/* Chat Messages Scrollable Area */}
          <div style={{ flex: 1, padding: '1.25rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', maxHeight: '520px' }}>
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const nodes = msg.matchedNodes || [];
              const hasNodes = nodes.length > 0;
              const isExpanded = expandedNodes[msg.id] ?? false;

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '100%',
                  }}
                >
                  {/* Sender Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                    {isUser ? (
                      <span>You</span>
                    ) : (
                      <>
                        <Brain size={13} style={{ color: '#8b5cf6' }} />
                        <strong style={{ color: 'var(--fg-primary)' }}>Store Intelligence</strong>
                        {msg.isPersonalized && (
                          <span style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8b5cf6', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700, fontSize: '0.68rem' }}>
                            RAG Grounded
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div
                    className={isUser ? 'user-formatted' : 'assistant-formatted'}
                    style={{
                      maxWidth: '85%',
                      padding: '0.9rem 1.15rem',
                      borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      background: isUser ? 'var(--fg-primary)' : 'var(--bg-muted)',
                      color: isUser ? 'var(--bg-canvas)' : 'var(--fg-primary)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      wordBreak: 'break-word',
                      boxShadow: 'var(--shadow-xs)',
                    }}
                  >
                    <FormattedMessage content={msg.content} isUser={isUser} />
                  </div>

                  {/* Grounded Product Nodes Citation Card (When RAG matched products) */}
                  {!isUser && hasNodes && (
                    <div
                      style={{
                        marginTop: '0.6rem',
                        maxWidth: '85%',
                        width: '100%',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        background: 'rgba(139, 92, 246, 0.04)',
                        padding: '0.65rem 0.85rem',
                      }}
                    >
                      <div
                        onClick={() => toggleNodeExpansion(msg.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          fontSize: '0.785rem',
                          fontWeight: 700,
                          color: '#8b5cf6',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <ShieldCheck size={14} />
                          {nodes.length} Grounded Product Node{nodes.length === 1 ? '' : 's'} Retrieved from Store Knowledge
                        </span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </div>

                      {isExpanded && (
                        <div style={{ marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {nodes.map((node) => (
                            <div
                              key={node.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'var(--bg-canvas)',
                                padding: '0.5rem 0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)',
                                fontSize: '0.785rem',
                              }}
                            >
                              <div style={{ flex: 1, marginRight: '0.5rem' }}>
                                <strong style={{ color: 'var(--fg-primary)', display: 'block' }}>{node.title}</strong>
                                <span style={{ color: 'var(--fg-muted)', fontSize: '0.72rem' }}>
                                  Category: {node.category} · Stock: {node.stock} units
                                </span>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontWeight: 800, color: 'var(--fg-primary)', display: 'block' }}>
                                  {formatINR(node.price)}
                                </span>
                                {node.similarity !== undefined && (
                                  <span style={{ fontSize: '0.68rem', color: '#10b981', fontWeight: 700 }}>
                                    {(node.similarity * 100).toFixed(0)}% match
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--fg-muted)', fontSize: '0.85rem' }}>
                <Brain size={16} className="animate-spin" style={{ color: '#8b5cf6' }} />
                <span>Thinking and scanning {isPersonalized ? 'store embeddings' : 'conversational memory'}...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompt Suggestions */}
          <div
            style={{
              padding: '0.5rem 1.25rem',
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-muted)',
              display: 'flex',
              gap: '0.5rem',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
            }}
          >
            {[
              '📊 Generate Weekly Store Intelligence Digest',
              '⚠️ Predict restock needs & stockout velocity',
              '🗑️ Check products in the 7-day grace period',
              '💰 What are my highest priced items?',
            ].map((promptText) => (
              <button
                key={promptText}
                type="button"
                onClick={() => handleSendMessage(promptText)}
                disabled={isLoading}
                style={{
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.75rem',
                  borderRadius: '999px',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--fg-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  transition: 'all var(--transition-fast)',
                }}
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Text Input & Controls */}
          <div style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-canvas)' }}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={
                  isPersonalized
                    ? `Ask anything about ${activeShopName}'s products, inventory, prices, or policies...`
                    : 'Ask anything in general business / chat mode...'
                }
                style={{
                  flex: 1,
                  padding: '0.65rem 0.95rem',
                  fontSize: '0.875rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--fg-primary)',
                  resize: 'none',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !inputMessage.trim()}
                style={{
                  padding: '0.65rem 1.2rem',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  borderRadius: 'var(--radius-md)',
                  background: isPersonalized ? 'linear-gradient(135deg, #8b5cf6, #3b82f6)' : 'var(--fg-primary)',
                  color: '#fff',
                  border: 'none',
                  cursor: isLoading || !inputMessage.trim() ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !inputMessage.trim() ? 0.6 : 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: isPersonalized ? '0 2px 8px rgba(139, 92, 246, 0.3)' : 'none',
                }}
              >
                <Send size={15} /> Send
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 4. MODAL: 1-WEEK GRACE PERIOD / SOFT-DELETED RECOVERY */}
      {showGraceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <div
            style={{
              background: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '650px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid var(--border-subtle)',
              maxHeight: '85vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={20} style={{ color: '#ef4444' }} />
                  1-Week Grace Period & Recovery
                </h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
                  Products removed from your store are preserved for 7 days. Their RAG embeddings are retained so restoring them requires zero re-learning.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowGraceModal(false)}
                style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', color: 'var(--fg-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {(!stats?.gracePeriodItems || stats.gracePeriodItems.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--fg-muted)' }}>
                <CheckCircle2 size={36} style={{ color: '#10b981', margin: '0 auto 0.5rem auto' }} />
                <p style={{ fontWeight: 600 }}>No products currently in grace period.</p>
                <span style={{ fontSize: '0.8rem' }}>When products are deleted, they will be held here for 7 days before permanent deletion.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {stats.gracePeriodItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-muted)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.9rem', fontWeight: 700 }}>{item.title}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--fg-muted)' }}>
                        <span>Category: {item.category}</span>
                        <span>Price: {formatINR(item.price)}</span>
                        <span style={{ color: '#ef4444', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Clock size={12} />
                          {item.daysRemaining}d {item.hoursRemaining}h remaining to restore
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRestoreProduct(item.id)}
                      disabled={restoringId === item.id}
                      style={{
                        padding: '0.45rem 0.95rem',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-md)',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        cursor: restoringId === item.id ? 'not-allowed' : 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      <RotateCcw size={13} className={restoringId === item.id ? 'animate-spin' : ''} />
                      {restoringId === item.id ? 'Restoring...' : 'Restore Product'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button
                type="button"
                onClick={() => setShowGraceModal(false)}
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-muted)',
                  border: '1px solid var(--border-default)',
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
