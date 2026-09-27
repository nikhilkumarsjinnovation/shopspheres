import { createClient } from '@/lib/supabase/server';

export default async function SystemLogsPage() {
  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from('admin_audit_logs')
    .select('id, action, admin_id, target_entity, target_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div className="animate-slide-up" style={{ paddingBottom: '3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>System Audit Logs</h1>
        <p style={{ color: 'var(--fg-muted)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
          Immutable log of administrative modifications, role escalations, and moderation decisions.
        </p>
      </div>

      {error ? (
        <div style={{ padding: '1rem', background: 'var(--danger-bg)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem' }}>
          {error.message}
        </div>
      ) : null}

      {(logs ?? []).length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', color: 'var(--fg-muted)' }}>
          No admin actions recorded yet.
        </div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table className="portal-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action Type</th>
                <th>Target Entity</th>
                <th style={{ textAlign: 'right' }}>Admin ID</th>
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).map((log) => (
                <tr key={log.id}>
                  <td style={{ color: 'var(--fg-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(log.created_at).toLocaleString('en-IN')}
                  </td>
                  <td>
                    <span style={{ fontWeight: 600, padding: '0.2rem 0.5rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{log.target_entity}</span>{' '}
                    <code style={{ fontSize: '0.75rem', color: 'var(--fg-muted)' }}>({log.target_id.slice(0, 8)})</code>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <code style={{ fontSize: '0.75rem', color: 'var(--accent-electric)' }}>{log.admin_id.slice(0, 8)}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
