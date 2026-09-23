import { createClient } from '@/lib/supabase/server';
import * as styles from '../../admin.css';

export default async function SystemLogsPage() {
  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from('admin_audit_logs')
    .select('id, action, admin_id, target_entity, target_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Audit log</h1>
        <p className={styles.headerSubtitle}>Every admin change is recorded here. This is not a dump of customer activity.</p>
      </div>
      {error ? <div className={styles.emptyState}>{error.message}</div> : null}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.th}>When</th>
              <th className={styles.th}>Action</th>
              <th className={styles.th}>Target</th>
              <th className={styles.th}>Admin</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id} className={styles.tr}>
                <td className={styles.td}>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                <td className={styles.td}>{log.action}</td>
                <td className={styles.td}>{log.target_entity} {log.target_id.slice(0, 8)}</td>
                <td className={styles.td}>{log.admin_id.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(logs ?? []).length === 0 ? <div className={styles.emptyState}>No admin actions recorded yet.</div> : null}
    </div>
  );
}
