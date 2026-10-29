import { DAMAGE_CATEGORIES, REPORT_STATUSES, SEVERITIES, labelOf } from '@laporjalan/shared';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ErrorBox, PriorityBadge, StatusBadge, btn, btnGhost, card, fmtDate, input } from '@/lib/ui';

export type SearchParams = Record<string, string | string[] | undefined>;

type Row = {
  id: string; created_at: string; reporter_name: string | null; title: string; category: string;
  province_code: string | null; regency_code: string | null; severity: string;
  priority_score: number | null; priority_level: string | null; status: string; agency_name: string | null;
};
type Result = { total: number; page: number; page_size: number; rows: Row[] };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
const PAGE_SIZE = 20;

/**
 * Server-rendered table. All filtering, sorting and pagination run in the database
 * (admin_list_reports), which also applies the caller's jurisdiction.
 */
export async function ReportsTable({ title, basePath, params, fixedStatuses, defaultSort = 'created_at' }: {
  title: string; basePath: string; params: SearchParams; fixedStatuses?: string[]; defaultSort?: 'created_at' | 'priority';
}) {
  const supabase = await createClient();
  const q = one(params.q);
  const category = one(params.category);
  const severity = one(params.severity);
  const statusParam = one(params.status);
  const sortParam = one(params.sort);
  const sort = sortParam === 'priority' || sortParam === 'created_at' ? sortParam : defaultSort;
  const dir = one(params.dir) === 'asc' ? 'asc' : 'desc';
  const page = Math.max(1, Number(one(params.page)) || 1);

  const validStatus = REPORT_STATUSES.some((s) => s.value === statusParam) ? statusParam : undefined;
  const statuses = fixedStatuses ?? (validStatus ? [validStatus] : null);

  const { data, error } = await supabase.rpc('admin_list_reports', {
    p_search: q ?? null,
    p_statuses: statuses,
    p_category: DAMAGE_CATEGORIES.some((c) => c.value === category) ? category : null,
    p_severity: SEVERITIES.some((s) => s.value === severity) ? severity : null,
    p_sort: sort, p_dir: dir, p_page: page, p_page_size: PAGE_SIZE,
  });
  if (error || !data) return <ErrorBox message="Gagal memuat laporan. Coba muat ulang halaman." />;
  const res = data as Result;

  const codes = [...new Set(res.rows.flatMap((r) => [r.province_code, r.regency_code]).filter((c): c is string => !!c))];
  const { data: regions } = codes.length ? await supabase.from('regions').select('code,name').in('code', codes) : { data: [] };
  const regionName = (c: string | null) => regions?.find((r) => r.code === c)?.name;

  const totalPages = Math.max(1, Math.ceil(res.total / PAGE_SIZE));
  const link = (over: Record<string, string | number | undefined>) => {
    const sp = new URLSearchParams();
    const merged = { q, category, severity, status: validStatus, sort, dir, ...over };
    for (const [k, v] of Object.entries(merged)) if (v !== undefined && v !== '') sp.set(k, String(v));
    return `${basePath}?${sp.toString()}`;
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>

      <form method="get" className={`${card} flex flex-wrap items-end gap-3`}>
        <label className="text-sm">Cari
          <input name="q" defaultValue={q} placeholder="Judul, jalan, atau ID" className={`${input} mt-1`} />
        </label>
        <label className="text-sm">Kategori
          <select name="category" defaultValue={category ?? ''} className={`${input} mt-1`}>
            <option value="">Semua</option>
            {DAMAGE_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="text-sm">Keparahan
          <select name="severity" defaultValue={severity ?? ''} className={`${input} mt-1`}>
            <option value="">Semua</option>
            {SEVERITIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        {!fixedStatuses && (
          <label className="text-sm">Status
            <select name="status" defaultValue={validStatus ?? ''} className={`${input} mt-1`}>
              <option value="">Semua</option>
              {REPORT_STATUSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </label>
        )}
        <label className="text-sm">Urutkan
          <select name="sort" defaultValue={sort} className={`${input} mt-1`}>
            <option value="created_at">Tanggal</option>
            <option value="priority">Prioritas</option>
          </select>
        </label>
        <label className="text-sm">Arah
          <select name="dir" defaultValue={dir} className={`${input} mt-1`}>
            <option value="desc">Terbaru / tertinggi</option>
            <option value="asc">Terlama / terendah</option>
          </select>
        </label>
        <button className={btn}>Terapkan</button>
        <Link href={basePath} className={btnGhost}>Atur ulang</Link>
      </form>

      <div className={`${card} overflow-x-auto p-0`}>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-700">
            <tr>
              {['ID', 'Tanggal', 'Pelapor', 'Kategori', 'Wilayah', 'Keparahan', 'Prioritas', 'Status', 'Instansi', ''].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-slate-900 dark:text-slate-100">
            {res.rows.length === 0 ? (
              <tr><td colSpan={10} className="px-3 py-8 text-center text-slate-500">Tidak ada laporan yang cocok.</td></tr>
            ) : res.rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 dark:border-slate-700">
                <td className="px-3 py-2 font-mono text-xs">{r.id.slice(0, 8)}</td>
                <td className="whitespace-nowrap px-3 py-2">{fmtDate(r.created_at)}</td>
                <td className="px-3 py-2">{r.reporter_name || '-'}</td>
                <td className="px-3 py-2">{labelOf(DAMAGE_CATEGORIES, r.category)}</td>
                <td className="px-3 py-2">{regionName(r.regency_code) ?? regionName(r.province_code) ?? '-'}</td>
                <td className="px-3 py-2">{labelOf(SEVERITIES, r.severity)}</td>
                <td className="px-3 py-2"><PriorityBadge level={r.priority_level} score={r.priority_score} /></td>
                <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                <td className="px-3 py-2">{r.agency_name ?? '-'}</td>
                <td className="px-3 py-2"><Link href={`/reports/${r.id}`} className="font-medium text-blue-600 hover:underline">Detail</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <nav aria-label="Halaman" className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
        <span>{res.total} laporan · halaman {res.page} dari {totalPages}</span>
        <span className="flex gap-2">
          {page > 1 && <Link href={link({ page: page - 1 })} className={btnGhost}>Sebelumnya</Link>}
          {page < totalPages && <Link href={link({ page: page + 1 })} className={btnGhost}>Berikutnya</Link>}
        </span>
      </nav>
    </section>
  );
}
