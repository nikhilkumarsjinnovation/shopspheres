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
}

interface AgentBackgroundContextType {
  activeTask: BackgroundAgentTask | null;
  lastCompletedTask: BackgroundAgentTask | null;
  messages: AgentChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<AgentChatMessage[]>>;
  sessionId: string;
  isWorking: boolean;
  notificationPermission: NotificationPermission;
  requestNotifications: () => Promise<NotificationPermission>;
  submitBackgroundTask: (text: string, persona?: string) => Promise<void>;
  dismissToast: () => void;
  clearMessages: () => void;
}

const AgentBackgroundContext = createContext<AgentBackgroundContextType | undefined>(undefined);

const STORAGE_KEY_SESSION = 'shopsphere_agent_session_id';
const STORAGE_KEY_MESSAGES = 'shopsphere_agent_messages_cache';
const STORAGE_KEY_ACTIVE_TASK = 'shopsphere_agent_active_task';
const STORAGE_KEY_LAST_COMPLETED = 'shopsphere_agent_last_completed_task';

export const DEFAULT_AGENT_WELCOME_MESSAGE: AgentChatMessage = {
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
};

export function AgentBackgroundProvider({ children }: { children: React.ReactNode }) {
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<AgentChatMessage[]>([DEFAULT_AGENT_WELCOME_MESSAGE]);
  const [activeTask, setActiveTask] = useState<BackgroundAgentTask | null>(null);
  const [lastCompletedTask, setLastCompletedTask] = useState<BackgroundAgentTask | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [toastVisible, setToastVisible] = useState(false);
  const [toastContent, setToastContent] = useState<{ title: string; body: string; taskId: string } | null>(null);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

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

    // Check notification permission
    setNotificationPermission(getNotificationPermissionStatus());

    // Restore cached messages
    try {
      const cached = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (err) {
      console.warn('Could not parse cached messages:', err);
    }

    // Restore active background task if any
    try {
      const storedTask = localStorage.getItem(STORAGE_KEY_ACTIVE_TASK);
      if (storedTask) {
        const parsedTask = JSON.parse(storedTask) as BackgroundAgentTask;
        if (parsedTask && parsedTask.status === 'running') {
          // If task started more than 3 minutes ago, mark as timed out
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

        if (data.type === 'TASK_STARTED') {
          setActiveTask(data.task);
        } else if (data.type === 'TASK_COMPLETED') {
          setActiveTask(null);
          setLastCompletedTask(data.task);
          if (Array.isArray(data.updatedMessages)) {
            setMessages(data.updatedMessages);
          }
          // Show toast on other tabs as well
          setToastContent({
            title: 'Agent Completed Task',
            body: data.task.reply?.slice(0, 120) || `Task "${data.task.prompt}" finished.`,
            taskId: data.task.id,
          });
          setToastVisible(true);
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
  }, []);

  // Sync messages to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && messages.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messages.slice(-50)));
      } catch (err) {
        console.warn('Failed to cache agent messages:', err);
      }
    }
  }, [messages]);

  const requestNotifications = async (): Promise<NotificationPermission> => {
    const status = await requestNotificationPermission();
    setNotificationPermission(status);
    return status;
  };

  const dismissToast = () => {
    setToastVisible(false);
  };

  const clearMessages = () => {
    setMessages([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_MESSAGES);
    }
  };

  /**
   * Resilient Background Task Submitter
   * Continues running across tab switches and route navigations!
   */
  const submitBackgroundTask = useCallback(
    async (text: string, persona = 'tech') => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const currentSid = sessionId || `sess_${Date.now()}`;
      const taskId = `task_${Date.now()}`;

      const userMsg: AgentChatMessage = {
        id: `usr_${Date.now()}`,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
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

      try {
        // Request background execution from API
        const res = await fetchWithCsrf('/api/v1/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: trimmed,
            persona,
            sessionId: currentSid,
          }),
        });

        if (!res.ok) {
          throw new Error('AI Agent service temporarily unavailable');
        }

        const data = await res.json();

        // 2. Dispatch reactive client actions (Cart, Favorites, Wallet)
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
        };

        const completedTask: BackgroundAgentTask = {
          ...task,
          status: 'completed',
          completedAt: Date.now(),
          reply: data.reply,
          actionCards: data.actionCards,
          toolExecutions: data.toolExecutions,
        };

        // 3. Update global messages
        setMessages((prev) => {
          const updated = [...prev, assistantMsg];
          if (broadcastChannelRef.current) {
            broadcastChannelRef.current.postMessage({
              type: 'TASK_COMPLETED',
              task: completedTask,
              updatedMessages: updated,
            });
          }
          return updated;
        });

        setActiveTask(null);
        setLastCompletedTask(completedTask);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEY_ACTIVE_TASK);
          localStorage.setItem(STORAGE_KEY_LAST_COMPLETED, JSON.stringify(completedTask));
        }

        // 4. Trigger Multi-Channel Completion Notification!
        // (Plays audio chime, flashes title if tab is inactive, and triggers native Web Notification)
        triggerAgentCompletionAlert(trimmed, data.reply || 'Task finished!');

        // 5. Show in-app completion toast banner
        setToastContent({
          title: 'Autonomous Agent Task Completed',
          body: data.reply ? data.reply.slice(0, 110) + '…' : `Finished: "${trimmed}"`,
          taskId,
        });
        setToastVisible(true);

        // Auto-dismiss in-app toast after 8 seconds
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
    [sessionId]
  );

  return (
    <AgentBackgroundContext.Provider
      value={{
        activeTask,
        lastCompletedTask,
        messages,
        setMessages,
        sessionId,
        isWorking: activeTask?.status === 'running',
        notificationPermission,
        requestNotifications,
        submitBackgroundTask,
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
