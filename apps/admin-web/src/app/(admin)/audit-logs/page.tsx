import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ErrorBox, btnGhost, card, fmtDate } from '@/lib/ui';

type Log = {
  id: string; created_at: string; action: string; table_name: string; record_id: string | null;
  actor_name: string | null; actor_id: string | null; old_value: unknown; new_value: unknown;
};

export default async function AuditLogs({ searchParams }: PageProps<'/audit-logs'>) {
  await requireStaff(['super_admin']);
  const sp = await searchParams;
  const page = Math.max(1, Number(Array.isArray(sp.page) ? sp.page[0] : sp.page) || 1);
  const supabase = await createClient();
  // list_audit_logs() re-checks super_admin inside the database.
  const { data, error } = await supabase.rpc('list_audit_logs', { p_page: page, p_page_size: 50 });
  if (error || !data) return <ErrorBox message="Gagal memuat log audit." />;
  const res = data as { total: number; rows: Log[] };
  const pages = Math.max(1, Math.ceil(res.total / 50));

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Log Audit</h1>
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full text-left text-sm text-slate-900 dark:text-slate-100">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
            <tr>{['Waktu', 'Pelaku', 'Tindakan', 'Data', 'Sebelum', 'Sesudah'].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {res.rows.map((l) => (
              <tr key={l.id} className="border-b border-slate-100 align-top last:border-0 dark:border-slate-700">
                <td className="whitespace-nowrap px-3 py-2">{fmtDate(l.created_at)}</td>
                <td className="px-3 py-2">{l.actor_name || (l.actor_id ? l.actor_id.slice(0, 8) : 'sistem')}</td>
                <td className="px-3 py-2">{l.action}</td>
                <td className="px-3 py-2">{l.table_name}<div className="font-mono text-xs">{l.record_id?.slice(0, 8)}</div></td>
                <td className="max-w-xs px-3 py-2"><pre className="whitespace-pre-wrap break-words text-xs">{l.old_value ? JSON.stringify(l.old_value) : '-'}</pre></td>
                <td className="max-w-xs px-3 py-2"><pre className="whitespace-pre-wrap break-words text-xs">{l.new_value ? JSON.stringify(l.new_value) : '-'}</pre></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <nav aria-label="Halaman" className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
        <span>{res.total} catatan · halaman {page} dari {pages}</span>
        <span className="flex gap-2">
          {page > 1 && <Link className={btnGhost} href={`/audit-logs?page=${page - 1}`}>Sebelumnya</Link>}
          {page < pages && <Link className={btnGhost} href={`/audit-logs?page=${page + 1}`}>Berikutnya</Link>}
        </span>
      </nav>
    </section>
  );
}
