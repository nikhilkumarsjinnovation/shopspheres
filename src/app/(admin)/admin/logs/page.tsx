import { createClient } from '@/lib/supabase/server';

export default async function SystemLogsPage() {
  const supabase = await createClient();
  const { data: logs, error } = await supabase
    .from('admin_audit_logs')
    .select('id, action, admin_id, target_entity, target_id, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <div>
        <h1>Audit log</h1>
        <p>Every admin change is recorded here. This is not a dump of customer activity.</p>
      </div>
      {error ? <div>{error.message}</div> : null}
      <div>
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Target</th>
              <th>Admin</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => (
              <tr key={log.id}>
                <td>{new Date(log.created_at).toLocaleString('en-IN')}</td>
                <td>{log.action}</td>
                <td>{log.target_entity} {log.target_id.slice(0, 8)}</td>
                <td>{log.admin_id.slice(0, 8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(logs ?? []).length === 0 ? <div>No admin actions recorded yet.</div> : null}
    </div>
  );
}
