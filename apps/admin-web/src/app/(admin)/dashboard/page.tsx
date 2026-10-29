import { DAMAGE_CATEGORIES, labelOf } from '@laporjalan/shared';
import { CategoryChart, MonthlyChart } from '@/components/charts';
import { createClient } from '@/lib/supabase/server';
import { ErrorBox, card } from '@/lib/ui';

type Overview = {
  total: number; pending: number; verified: number; in_progress: number; completed: number;
  rejected: number; critical: number;
  by_category: Record<string, number>;
  monthly: { month: string; total: number }[];
};

const CARDS: { key: keyof Overview; label: string }[] = [
  { key: 'total', label: 'Total laporan' },
  { key: 'pending', label: 'Menunggu verifikasi' },
  { key: 'verified', label: 'Terverifikasi' },
  { key: 'in_progress', label: 'Dalam penanganan' },
  { key: 'completed', label: 'Selesai' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'critical', label: 'Kerusakan kritis (belum selesai)' },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  // SECURITY INVOKER: RLS scopes every number to the caller's jurisdiction.
  const { data, error } = await supabase.rpc('overview_stats');
  if (error || !data) return <ErrorBox message="Gagal memuat statistik. Coba muat ulang halaman." />;
  const s = data as Overview;

  const categories = Object.entries(s.by_category)
    .map(([k, v]) => ({ name: labelOf(DAMAGE_CATEGORIES, k), total: v }))
    .sort((a, b) => b.total - a.total);
  const monthly = s.monthly.map((m) => ({ name: m.month, total: m.total }));

  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dasbor</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((c) => (
          <div key={c.key} className={card}>
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white">{s[c.key] as number}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Tren laporan (12 bulan)</h2>
          <MonthlyChart data={monthly} />
        </div>
        <div className={card}>
          <h2 className="mb-3 font-semibold text-slate-900 dark:text-white">Kategori kerusakan</h2>
          <CategoryChart data={categories} />
        </div>
      </div>
    </section>
  );
}
