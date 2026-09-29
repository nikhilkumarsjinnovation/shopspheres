'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { fetchWithCsrf } from '@/lib/csrf-client';
import {
  triggerAgentCompletionAlert,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  stopTitleFlash,
} from '@/lib/agent-notifications';
import { Bot, CheckCircle2, ArrowRight, X, Sparkles } from 'lucide-react';

export interface BackgroundAgentTask {
  id: string;
  prompt: string;
  persona: string;
  sessionId: string;
  status: 'running' | 'completed' | 'error';
  startedAt: number;
  completedAt?: number;
  reply?: string;
  actionCards?: any[];
  toolExecutions?: any[];
  error?: string;
}

export interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actionCards?: any[];
  toolExecutions?: any[];
  recommendedProducts?: any[];
  createdAt?: string;
  mode?: 'chat' | 'agent';
  validationReport?: any;
  provenance?: {
    verifiedAt: string;
    source: string;
    rowCount: number;
    confidence: 'verified' | 'qualified';
  };
  quickReplies?: string[];
  needsClarification?: boolean;
}

export interface AgentChatSession {
  id: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface AgentBackgroundContextType {
  activeTask: BackgroundAgentTask | null;
  lastCompletedTask: BackgroundAgentTask | null;
  messages: AgentChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AgentChatMessage[]>>;
  sessionId: string;
  sessions: AgentChatSession[];
  isWorking: boolean;
  mode: 'chat' | 'agent';
  setMode: (mode: 'chat' | 'agent') => void;
  notificationPermission: NotificationPermission;
  requestNotifications: () => Promise<NotificationPermission>;
  submitBackgroundTask: (text: string, persona?: string, overrideMode?: 'chat' | 'agent') => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  createNewSession: () => void;
  deleteSession: (sessionId: string) => Promise<void>;
  refreshSessions: () => Promise<void>;
  dismissToast: () => void;
  clearMessages: () => void;
}

const AgentBackgroundContext = createContext<AgentBackgroundContextType | undefined>(undefined);

const STORAGE_KEY_SESSION = 'shopsphere_agent_session_id';
const STORAGE_KEY_SESSIONS = 'shopsphere_agent_sessions_index';
const STORAGE_KEY_ACTIVE_TASK = 'shopsphere_agent_active_task';
const STORAGE_KEY_LAST_COMPLETED = 'shopsphere_agent_last_completed_task';
const STORAGE_KEY_MODE = 'shopsphere_ai_interaction_mode';

export const DEFAULT_AGENT_WELCOME_MESSAGE: AgentChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    `### 👋 Namaste! Welcome to your ShopSphere AI Shopping Companion.\n\n` +
    `I am your intelligent assistant powered by Gemini and governed by Supabase database controls. Toggle between **💬 Chat Mode** for shopping advice and product guidance, and **⚡ Agent Mode** for autonomous task execution and purchases.\n\n` +
    `**Core Capabilities:**\n` +
    `- 🎯 **Strict Budget & Category Search:** Tell me any category and price limit (e.g., *"Smartphones under ₹20,000"*). I will strictly honor your constraints.\n` +
    `- ⚡ **1-Tap In-App Wallet Checkout:** Say *"Purchase the first phone for me"* and I will reserve inventory and present instant 1-tap confirmation.\n` +
    `- 🛡️ **Relaxed Lenient Cancellation:** Any order placed through me can be cancelled through the packed stage with an instant 100% wallet refund.\n` +
    `- ❓ **Smart Clarification:** If you're not sure, tell me what you're thinking and I'll ask smart follow-up questions to find the exact match!\n\n` +
    `Select a prompt below or type your request:`,
  quickReplies: [
    '📱 Smartphones under ₹20,000',
    '👟 Running Shoes under ₹2,000',
    '💳 Check My Wallet Balance',
    '🎁 Surprise Gift for a Friend',
  ],
  provenance: {
    verifiedAt: new Date().toISOString(),
    source: 'ShopSphere Governed Core',
    rowCount: 0,
    confidence: 'verified',
  },
};

function getMsgStorageKey(sid: string) {
  return `shopsphere_agent_msgs_${sid}`;
}

export function AgentBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<AgentChatSession[]>([]);
  const [messages, setMessages] = useState<AgentChatMessage[]>([DEFAULT_AGENT_WELCOME_MESSAGE]);
  const [activeTask, setActiveTask] = useState<BackgroundAgentTask | null>(null);
  const [lastCompletedTask, setLastCompletedTask] = useState<BackgroundAgentTask | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastContent, setToastContent] = useState<{ title: string; body: string; taskId: string } | null>(null);
  const [mode, setModeState] = useState<'chat' | 'agent'>('agent');

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  const setMode = useCallback((newMode: 'chat' | 'agent') => {
    setModeState(newMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_MODE, newMode);
    }
    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'MODE_CHANGED', mode: newMode });
    }
  }, []);

  // Refresh sessions from backend and localStorage
  const refreshSessions = useCallback(async () => {
    if (typeof window === 'undefined') return;

    // 1. Load locally cached sessions
    let localSessions: AgentChatSession[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (stored) {
        localSessions = JSON.parse(stored);
      }
    } catch {
      // ignore
    }

    // 2. Fetch server sessions
    try {
      const res = await fetchWithCsrf('/api/v1/ai/conversations');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.sessions)) {
          // Merge local and server sessions
          const map = new Map<string, AgentChatSession>();
          for (const s of localSessions) {
            map.set(s.id, s);
          }
          for (const s of data.sessions) {
            map.set(s.id, s);
          }
          const merged = Array.from(map.values()).sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          setSessions(merged);
          localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(merged));
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch conversations from server:', err);
    }

    if (localSessions.length > 0) {
      setSessions(localSessions);
    }
  }, []);

  // Initialize session ID and load cached state
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load or generate session ID
    let currentSession = localStorage.getItem(STORAGE_KEY_SESSION);
    if (!currentSession) {
      currentSession = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      localStorage.setItem(STORAGE_KEY_SESSION, currentSession);
    }
    setSessionId(currentSession);

    // Restore mode
    const storedMode = localStorage.getItem(STORAGE_KEY_MODE);
    if (storedMode === 'chat' || storedMode === 'agent') {
      setModeState(storedMode);
    }

    // Check notification permission
    setNotificationPermission(getNotificationPermissionStatus());

    // Restore cached messages for this current session
    try {
      const cached = localStorage.getItem(getMsgStorageKey(currentSession));
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (err) {
      console.warn('Could not parse cached messages:', err);
    }

    // Load sessions index
    refreshSessions();

    // Restore active background task if any
    try {
      const storedTask = localStorage.getItem(STORAGE_KEY_ACTIVE_TASK);
      if (storedTask) {
        const parsedTask = JSON.parse(storedTask) as BackgroundAgentTask;
        if (parsedTask && parsedTask.status === 'running') {
          if (Date.now() - parsedTask.startedAt > 180000) {
            localStorage.removeItem(STORAGE_KEY_ACTIVE_TASK);
          } else {
            setActiveTask(parsedTask);
          }
        }
      }
    } catch (err) {
      console.warn('Could not parse active task:', err);
    }

    // Initialize cross-tab BroadcastChannel
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('shopsphere_agent_channel');
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === 'MODE_CHANGED' && (data.mode === 'chat' || data.mode === 'agent')) {
          setModeState(data.mode);
        } else if (data.type === 'TASK_STARTED') {
          setActiveTask(data.task);
        } else if (data.type === 'TASK_COMPLETED') {
          setActiveTask(null);
          setLastCompletedTask(data.task);
          if (data.task.sessionId === currentSession && Array.isArray(data.updatedMessages)) {
            setMessages(data.updatedMessages);
          }
          setToastContent({
            title: 'Agent Completed Task',
            body: data.task.reply?.slice(0, 120) || `Task "${data.task.prompt}" finished.`,
            taskId: data.task.id,
          });
          setToastVisible(true);
          refreshSessions();
        } else if (data.type === 'SESSIONS_UPDATED') {
          refreshSessions();
        }
      };
    }

    // Focus listener to clear title flash
    const handleFocus = () => {
      stopTitleFlash();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
      }
    };
  }, [refreshSessions]);

  // Sync messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionId && messages.length > 0) {
      try {
        localStorage.setItem(getMsgStorageKey(sessionId), JSON.stringify(messages.slice(-50)));
      } catch (err) {
        console.warn('Failed to cache agent messages:', err);
      }
    }
  }, [messages, sessionId]);

  const requestNotifications = async (): Promise<NotificationPermission> => {
    const status = await requestNotificationPermission();
    setNotificationPermission(status);
    return status;
  };

  const dismissToast = () => {
    setToastVisible(false);
  };

  const clearMessages = () => {
    setMessages([DEFAULT_AGENT_WELCOME_MESSAGE]);
    if (typeof window !== 'undefined' && sessionId) {
      localStorage.removeItem(getMsgStorageKey(sessionId));
    }
  };

  /**
   * Switch between chat sessions seamlessly
   */
  const switchSession = useCallback(async (newSid: string) => {
    if (!newSid || newSid === sessionId) return;

    setSessionId(newSid);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SESSION, newSid);
    }

    // 1. Try local cache first for instant UI response
    let loadedFromLocal = false;
    if (typeof window !== 'undefined') {
      const localCached = localStorage.getItem(getMsgStorageKey(newSid));
      if (localCached) {
        try {
          const parsed = JSON.parse(localCached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setMessages(parsed);
            loadedFromLocal = true;
          }
        } catch {
          // ignore
        }
      }
    }

    // 2. Fetch full message history from server for this session
    try {
      const res = await fetchWithCsrf(`/api/v1/ai/conversations?sessionId=${newSid}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
          if (typeof window !== 'undefined') {
            localStorage.setItem(getMsgStorageKey(newSid), JSON.stringify(data.messages));
          }
          return;
        }
      }
    } catch (err) {
      console.warn('Failed to load session messages from server:', err);
    }

    if (!loadedFromLocal) {
      setMessages([DEFAULT_AGENT_WELCOME_MESSAGE]);
    }
  }, [sessionId]);

  /**
   * Start a brand new Chat Thread (ChatGPT / Gemini style)
   */
  const createNewSession = useCallback(() => {
    const newSid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setSessionId(newSid);
    setMessages([DEFAULT_AGENT_WELCOME_MESSAGE]);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SESSION, newSid);
      localStorage.setItem(getMsgStorageKey(newSid), JSON.stringify([DEFAULT_AGENT_WELCOME_MESSAGE]));

      const newSessionMeta: AgentChatSession = {
        id: newSid,
        title: 'New Shopping Chat',
        lastMessage: 'Ready to assist...',
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSessions((prev) => {
        const updated = [newSessionMeta, ...prev.filter((s) => s.id !== newSid)];
        localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updated));
        return updated;
      });
    }

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'SESSIONS_UPDATED' });
    }
  }, []);

  /**
   * Delete a chat session
   */
  const deleteSession = useCallback(async (targetSid: string) => {
    if (!targetSid) return;

    // 1. Call server DELETE
    try {
      await fetchWithCsrf(`/api/v1/ai/conversations?sessionId=${targetSid}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Failed to delete session on server:', err);
    }

    // 2. Remove from local storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(getMsgStorageKey(targetSid));
    }

    // 3. Update session list
    const remaining = sessions.filter((s) => s.id !== targetSid);
    setSessions(remaining);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(remaining));
    }

    // 4. If current active session was deleted, switch to another or create new
    if (targetSid === sessionId) {
      if (remaining.length > 0) {
        await switchSession(remaining[0].id);
      } else {
        createNewSession();
      }
    }

    if (broadcastChannelRef.current) {
      broadcastChannelRef.current.postMessage({ type: 'SESSIONS_UPDATED' });
    }
  }, [sessions, sessionId, switchSession, createNewSession]);

  /**
   * Resilient Background Task Submitter
   * Preserves full multi-turn conversation history across turns!
   */
  const submitBackgroundTask = useCallback(
    async (text: string, persona = 'tech', overrideMode?: 'chat' | 'agent') => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const effectiveMode = overrideMode || mode;
      const currentSid = sessionId || `sess_${Date.now()}`;
      const taskId = `task_${Date.now()}`;

      const userMsg: AgentChatMessage = {
        id: `usr_${Date.now()}`,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
        mode: effectiveMode,
      };

      const task: BackgroundAgentTask = {
        id: taskId,
        prompt: trimmed,
        persona,
        sessionId: currentSid,
        status: 'running',
        startedAt: Date.now(),
      };

      // 1. Update active task state and persist immediately
      setActiveTask(task);
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_ACTIVE_TASK, JSON.stringify(task));
      }

      // Broadcast task start to all open tabs
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.postMessage({ type: 'TASK_STARTED', task });
      }

      // Add user message to conversation list
      setMessages((prev) => [...prev, userMsg]);

      // Prepare in-thread history for conversational memory (retain up to 30 recent messages)
      const recentHistory = messages
        .filter((m) => m.id !== 'welcome' && (m.role === 'user' || m.role === 'assistant'))
        .slice(-30)
        .map((m) => ({ role: m.role, content: m.content }));

      try {
        // Request execution from API with full history and active interaction mode
        const res = await fetchWithCsrf('/api/v1/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            persona,
            sessionId: currentSid,
            history: recentHistory,
            mode: effectiveMode,
          }),
        });

        if (!res.ok) {
          throw new Error('AI Agent service temporarily unavailable');
        }

        const data = await res.json();

        // Dispatch reactive client actions (Cart, Favorites, Wallet)
        if (Array.isArray(data.clientActions)) {
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

        if (data.behavioralProfile) {
          window.dispatchEvent(
            new CustomEvent('shopsphere:profile-update', { detail: data.behavioralProfile })
          );
        }

        if (data.feedUpdated) {
          window.dispatchEvent(
            new CustomEvent('shopsphere:feed-updated', { detail: data })
          );
        }

        const assistantMsg: AgentChatMessage = {
          id: `ast_${Date.now()}`,
          role: 'assistant',
          content: data.reply || 'Task completed successfully!',
          actionCards: data.actionCards || [],
          toolExecutions: data.toolExecutions || [],
          recommendedProducts: data.recommendedProducts || [],
          createdAt: new Date().toISOString(),
          mode: data.mode || effectiveMode,
          validationReport: data.validationReport,
          provenance: data.provenance,
          quickReplies: data.quickReplies || [],
          needsClarification: data.needsClarification || false,
        };

        const completedTask: BackgroundAgentTask = {
          ...task,
          status: 'completed',
          completedAt: Date.now(),
          reply: data.reply,
          actionCards: data.actionCards,
          toolExecutions: data.toolExecutions,
        };

        // Update global messages
        setMessages((prev) => {
          const updated = [...prev, assistantMsg];
          if (typeof window !== 'undefined') {
            localStorage.setItem(getMsgStorageKey(currentSid), JSON.stringify(updated.slice(-50)));
          }
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({
              type: 'TASK_COMPLETED',
              task: completedTask,
              updatedMessages: updated,
            });
          }
          return updated;
        });

        // Update sessions index with new title / last message
        setSessions((prev) => {
          const title = trimmed.length > 40 ? trimmed.slice(0, 40) + '…' : trimmed;
          const existing = prev.find((s) => s.id === currentSid);
          let updatedSessions: AgentChatSession[];

          if (existing) {
            updatedSessions = prev.map((s) =>
              s.id === currentSid
                ? {
                    ...s,
                    title: s.title === 'New Shopping Chat' || !s.title ? title : s.title,
                    lastMessage: (data.reply || '').slice(0, 70),
                    messageCount: s.messageCount + 2,
                    updatedAt: new Date().toISOString(),
                  }
                : s
            );
          } else {
            updatedSessions = [
              {
                id: currentSid,
                title,
                lastMessage: (data.reply || '').slice(0, 70),
                messageCount: 2,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
              ...prev,
            ];
          }

          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(updatedSessions));
          }
          return updatedSessions;
        });

        setActiveTask(null);
        setLastCompletedTask(completedTask);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_TASK);
          localStorage.setItem(STORAGE_KEY_LAST_COMPLETED, JSON.stringify(completedTask));
        }

        // Trigger Multi-Channel Completion Notification
        triggerAgentCompletionAlert(trimmed, data.reply || 'Task finished!');

        // Show in-app completion toast banner
        setToastContent({
          title: 'Autonomous Agent Task Completed',
          body: data.reply ? data.reply.slice(0, 110) + '…' : `Finished: "${trimmed}"`,
          taskId,
        });
        setToastVisible(true);

        setTimeout(() => {
          setToastVisible(false);
        }, 8000);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Error executing background task';

        const errMsg: AgentChatMessage = {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ **Execution Error:** ${errorMsg}. Please try again.`,
          createdAt: new Date().toISOString(),
        };

        const failedTask: BackgroundAgentTask = {
          ...task,
          status: 'error',
          completedAt: Date.now(),
          error: errorMsg,
        };

        setMessages((prev) => [...prev, errMsg]);
        setActiveTask(null);
        setLastCompletedTask(failedTask);

        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_TASK);
        }
      }
    },
    [sessionId, messages, mode]
  );

  return (
    <AgentBackgroundContext.Provider
      value={{
        activeTask,
        lastCompletedTask,
        messages,
        setMessages,
        sessionId,
        sessions,
        isWorking: activeTask?.status === 'running',
        mode,
        setMode,
        notificationPermission,
        requestNotifications,
        submitBackgroundTask,
        switchSession,
        createNewSession,
        deleteSession,
        refreshSessions,
        dismissToast,
        clearMessages,
      }}
    >
      {children}

      {/* Floating In-App Completion Toast Banner */}
      {toastVisible && toastContent && (
        <aside
          className="agent-bg-toast animate-slide-up"
          role="status"
          aria-live="polite"
          aria-label="Agent Task Notification"
        >
          <div className="agent-bg-toast-icon">
            <Bot size={22} className="text-electric" />
          </div>
          <div className="agent-bg-toast-content">
            <div className="agent-bg-toast-title">
              <span>{toastContent.title}</span>
              <span className="toast-live-badge">Finished</span>
            </div>
            <p className="agent-bg-toast-body">{toastContent.body}</p>
            <div className="agent-bg-toast-actions">
              <Link href="/agent" onClick={() => setToastVisible(false)} className="toast-action-btn primary">
                <span>View Results</span>
                <ArrowRight size={13} />
              </Link>
              <button type="button" onClick={() => setToastVisible(false)} className="toast-action-btn secondary">
                Dismiss
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setToastVisible(false)}
            className="toast-close-btn"
            aria-label="Close notification"
          >
            <X size={16} />
          </button>
        </aside>
      )}
    </AgentBackgroundContext.Provider>
  );
}

export function useAgentBackground() {
  const context = useContext(AgentBackgroundContext);
  if (!context) {
    throw new Error('useAgentBackground must be used within an AgentBackgroundProvider');
  }
  return context;
}
