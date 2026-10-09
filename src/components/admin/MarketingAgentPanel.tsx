'use client';

import { useState, useTransition } from 'react';
import { Bot, Loader2, Send } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';

type Props = {
  onScheduled?: () => void;
};

/**
 * Admin-only entry to the marketing specialist (same /api/v1/ai/chat supervisor path).
 * Platform RAG & AI cannot schedule campaigns — this panel can.
 */
export default function MarketingAgentPanel({ onScheduled }: Props) {
  const [prompt, setPrompt] = useState(
    'Draft and schedule a 10% email promo to the lapsed segment.',
  );
  const [reply, setReply] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const message = prompt.trim();
    if (!message) return;

    startTransition(async () => {
      setError(null);
      setReply(null);
      try {
        const res = await fetchWithCsrf('/api/v1/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            mode: 'agent',
            persona: 'everyday',
            sessionId: `admin_mkt_${Date.now()}`,
          }),
        });
        const data = (await res.json()) as { reply?: string; error?: string; campaignId?: string };
        if (!res.ok) {
          throw new Error(data.error || 'Marketing agent request failed.');
        }
        setReply(data.reply || 'No reply.');
        if (data.reply && /Scheduled a |campaign [0-9a-f-]{8}|code SS/i.test(data.reply)) {
          onScheduled?.();
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Marketing agent failed.');
      }
    });
  };

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        marginBottom: '2rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', marginBottom: '1rem' }}>
        <Bot size={18} style={{ marginTop: '0.15rem', flexShrink: 0 }} />
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Marketing AI agent</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--fg-muted)' }}>
            This is the campaign specialist. It is <strong>not</strong> under Platform RAG &amp; AI.
            Ask it to draft/schedule one promo to <code>new</code>, <code>repeat</code>, or{' '}
            <code>lapsed</code>. Successful runs appear below with an AI badge.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={pending}
          placeholder="e.g. Schedule a 15% campaign to repeat buyers"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-subtle)',
            color: 'var(--fg-primary)',
            fontFamily: 'inherit',
            fontSize: '0.95rem',
            resize: 'vertical',
          }}
        />
        <button
          type="submit"
          disabled={pending || !prompt.trim()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            width: 'fit-content',
            padding: '0.7rem 1.15rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'var(--fg-primary)',
            color: 'var(--fg-inverted)',
            fontWeight: 700,
            cursor: pending ? 'not-allowed' : 'pointer',
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {pending ? 'Running…' : 'Ask marketing agent'}
        </button>
      </form>

      {error ? (
        <p style={{ marginTop: '1rem', color: 'var(--danger)', fontWeight: 600, fontSize: '0.9rem' }}>
          {error}
        </p>
      ) : null}

      {reply ? (
        <div
          style={{
            marginTop: '1rem',
            padding: '0.9rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-subtle)',
            fontSize: '0.9rem',
            whiteSpace: 'pre-wrap',
          }}
        >
          {reply}
        </div>
      ) : null}
    </div>
  );
}
