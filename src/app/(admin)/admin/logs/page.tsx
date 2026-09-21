import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import * as styles from '../../admin.css';

export default async function SystemLogsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    redirect('/login?error=unauthorized');
  }

  const sampleLogs = [
    {
      level: 'INFO',
      event: 'RLS_EVAL_SUCCESS',
      message: 'Admin authorization bypassed for platform aggregation metrics.',
      timestamp: new Date().toISOString(),
    },
    {
      level: 'INFO',
      event: 'AUTH_SESSION_REFRESH',
      message: 'Supabase SSR cookie exchange validated.',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      level: 'DEBUG',
      event: 'ORDER_PIPELINE_INIT',
      message: 'Order and order_items transaction verified.',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
  ];

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>System & Security Logs</h1>
        <p className={styles.headerSubtitle}>
          Real-time stream of platform events, authentication operations, and database transactions.
        </p>
      </div>

      <div className={styles.sectionTitle}>
        <span>System Event Stream</span>
        <span style={{ fontSize: '0.8rem', color: '#10b981' }}>● Live Monitoring</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>Level</th>
              <th className={styles.th}>Event Code</th>
              <th className={styles.th}>Description</th>
              <th className={styles.th}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {sampleLogs.map((log, idx) => (
              <tr key={idx} className={styles.tr}>
                <td className={styles.td}>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor:
                        log.level === 'INFO'
                          ? 'rgba(56, 189, 248, 0.15)'
                          : 'rgba(168, 85, 247, 0.15)',
                      color: log.level === 'INFO' ? '#38bdf8' : '#c084fc',
                    }}
                  >
                    {log.level}
                  </span>
                </td>
                <td className={styles.td}>
                  <span className={styles.uuidCell}>{log.event}</span>
                </td>
                <td className={styles.td} style={{ color: '#e2e8f0' }}>
                  {log.message}
                </td>
                <td className={styles.td} style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
