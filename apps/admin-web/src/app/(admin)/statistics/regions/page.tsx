import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ErrorBox, card } from '@/lib/ui';

type Row = { code: string; name: string | null; total: number; unresolved: number; completed: number; avg_handling_hours: number | null };
const LEVELS = ['Provinsi', 'Kabupaten/Kota', 'Kecamatan', 'Kelurahan/Desa'];

export default async function RegionStats({ searchParams }: PageProps<'/statistics/regions'>) {
  const sp = await searchParams;
  const level = Math.min(4, Math.max(1, Number(Array.isArray(sp.level) ? sp.level[0] : sp.level) || 1));
  const rawParent = Array.isArray(sp.parent) ? sp.parent[0] : sp.parent;
  const parent = level > 1 && rawParent && /^[0-9.]{2,16}$/.test(rawParent) ? rawParent : null;

  const supabase = await createClient();
  // SECURITY INVOKER: RLS limits the aggregation to the caller's jurisdiction.
  const { data, error } = await supabase.rpc('regional_stats', { p_level: level, p_parent: parent });
  if (error) return <ErrorBox message="Gagal memuat statistik wilayah." />;
  const rows = (data ?? []) as Row[];

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Statistik Wilayah — {LEVELS[level - 1]}</h1>
      {level > 1 && (
        <Link className="text-sm text-blue-600 hover:underline" href={level === 2 ? '/statistics/regions' : `/statistics/regions?level=${level - 1}`}>
          ← Naik satu tingkat
        </Link>
      )}
      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full text-left text-sm text-slate-900 dark:text-slate-100">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
            <tr>{['Wilayah', 'Total', 'Belum selesai', 'Selesai', 'Rata-rata penanganan (jam)'].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">Belum ada data.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.code} className="border-b border-slate-100 last:border-0 dark:border-slate-700">
                <td className="px-3 py-2">
                  {level < 4 ? <Link className="text-blue-600 hover:underline" href={`/statistics/regions?level=${level + 1}&parent=${r.code}`}>{r.name ?? r.code}</Link> : (r.name ?? r.code)}
                </td>
                <td className="px-3 py-2">{r.total}</td>
                <td className="px-3 py-2">{r.unresolved}</td>
                <td className="px-3 py-2">{r.completed}</td>
                <td className="px-3 py-2">{r.avg_handling_hours ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
