import { ACCESSIBILITY_IMPACTS, DAMAGE_CATEGORIES, PRIORITY_LEVELS, REPORT_STATUSES, ROAD_CLASSES, SEVERITIES, labelOf } from '@laporjalan/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ErrorBox, PriorityBadge, StatusBadge, btn, btnGhost, card, fmtDate, input } from '@/lib/ui';
import { assignOfficer, changeStatus, overridePriority, uploadEvidence } from './actions';

// Mirrors public.status_transition_allowed(); the database is the authority.
const NEXT: Record<string, string[]> = {
  diajukan: ['menunggu_verifikasi', 'terverifikasi', 'ditolak'],
  menunggu_verifikasi: ['terverifikasi', 'ditolak'],
  terverifikasi: ['dalam_penanganan', 'ditolak'],
  dalam_penanganan: ['selesai'],
  selesai: ['dalam_penanganan'],
  ditolak: [],
};
const ACTION_LABEL: Record<string, string> = {
  menunggu_verifikasi: 'Tandai menunggu verifikasi', terverifikasi: 'Verifikasi laporan',
  dalam_penanganan: 'Mulai penanganan', selesai: 'Nyatakan selesai', ditolak: 'Tolak laporan',
};

async function signedUrls(supabase: Awaited<ReturnType<typeof createClient>>, bucket: string, paths: string[]) {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  return data?.map((d) => d.signedUrl ?? '') ?? [];
}

export default async function ReportDetail({ params, searchParams }: PageProps<'/reports/[id]'>) {
  const { id } = await params;
  const sp = await searchParams;
  const staff = await requireStaff();
  const isAdmin = staff.roles.includes('super_admin') || staff.roles.includes('admin_daerah');
  const supabase = await createClient();

  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: report } = await supabase.from('reports').select('*').eq('id', id).maybeSingle();
  if (!report) notFound(); // also what out-of-jurisdiction staff see: RLS hides the row

  const [photos, history, evidence, scores, assignment, ctx, reporter, officers] = await Promise.all([
    supabase.from('report_photos').select('storage_path').eq('report_id', id),
    supabase.from('report_status_history').select('from_status,to_status,note,created_at,changed_by').eq('report_id', id).order('created_at'),
    supabase.from('repair_evidence').select('kind,storage_path,note,repaired_at,created_at').eq('report_id', id).order('created_at'),
    supabase.from('report_priority_scores').select('score,level,factors,config_version,is_override,override_reason,calculated_at').eq('report_id', id).order('calculated_at', { ascending: false }).limit(10),
    supabase.from('report_assignments').select('officer_id,created_at').eq('report_id', id).eq('active', true).maybeSingle(),
    supabase.rpc('report_context', { p_report_id: id }),
    report.reporter_id ? supabase.from('profiles').select('full_name').eq('id', report.reporter_id).maybeSingle() : Promise.resolve({ data: null }),
    isAdmin ? supabase.rpc('list_eligible_officers', { p_report_id: id }) : Promise.resolve({ data: [] }),
  ]);

  const photoUrls = await signedUrls(supabase, 'report-photos', (photos.data ?? []).map((p) => p.storage_path));
  const evUrls = await signedUrls(supabase, 'repair-evidence', (evidence.data ?? []).map((e) => e.storage_path));
  const context = ctx.data as { lat: number; lng: number; duplicates: { id: string; title: string; status: string; distance_m: number }[] } | null;
  const officerList = (officers.data ?? []) as { user_id: string; full_name: string; agency_name: string }[];
  const options = NEXT[report.status].filter((s) => isAdmin || (report.status === 'terverifikasi' && s === 'dalam_penanganan'));
  const error = typeof sp.error === 'string' ? sp.error : undefined;
  const ok = typeof sp.ok === 'string' ? sp.ok : undefined;

  return (
    <section className="space-y-4">
      <Link href="/reports" className="text-sm text-blue-600 hover:underline">← Semua laporan</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{report.title}</h1>
        <StatusBadge status={report.status} />
        <PriorityBadge level={report.priority_level} score={report.priority_score} />
      </div>
      {error && <ErrorBox message={error} />}
      {ok && <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">{ok}</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className={card}>
            <h2 className="mb-2 font-semibold text-slate-900 dark:text-white">Foto dari pelapor</h2>
            {photoUrls.length === 0 ? <p className="text-sm text-slate-500">Tidak ada foto.</p> : (
              <div className="flex flex-wrap gap-2">
                {photoUrls.map((u, i) => (
                  <a key={u} href={u} target="_blank" rel="noreferrer">
                    {/* signed URLs expire, so next/image optimisation is not used */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`Foto kerusakan ${i + 1}`} className="h-40 w-52 rounded-lg object-cover" />
                  </a>
                ))}
              </div>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm text-slate-700 dark:text-slate-200">
              <dt className="text-slate-500">Pelapor</dt><dd>{reporter.data?.full_name || '(anonim)'}</dd>
              <dt className="text-slate-500">Kategori</dt><dd>{labelOf(DAMAGE_CATEGORIES, report.category)}</dd>
              <dt className="text-slate-500">Keparahan (estimasi pelapor)</dt><dd>{labelOf(SEVERITIES, report.severity)}</dd>
              <dt className="text-slate-500">Dampak aksesibilitas</dt><dd>{labelOf(ACCESSIBILITY_IMPACTS, report.accessibility_impact)}</dd>
              <dt className="text-slate-500">Jalan</dt><dd>{report.road_name || '-'} ({labelOf(ROAD_CLASSES, report.road_class)})</dd>
              <dt className="text-slate-500">Koordinat</dt>
              <dd>{context ? <a className="text-blue-600 hover:underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${context.lat}&mlon=${context.lng}#map=18/${context.lat}/${context.lng}`}>{context.lat.toFixed(5)}, {context.lng.toFixed(5)}</a> : '-'}</dd>
              <dt className="text-slate-500">Dibuat</dt><dd>{fmtDate(report.created_at)}</dd>
            </dl>
            <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">{report.description}</p>
          </div>

          <div className={card}>
            <h2 className="mb-2 font-semibold text-slate-900 dark:text-white">Kemungkinan laporan ganda (≤100 m, kategori sama)</h2>
            {context?.duplicates.length ? (
              <ul className="space-y-1 text-sm">
                {context.duplicates.map((d) => (
                  <li key={d.id}><Link className="text-blue-600 hover:underline" href={`/reports/${d.id}`}>{d.title}</Link> · {d.distance_m} m · {labelOf(REPORT_STATUSES, d.status)}</li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">Tidak ditemukan.</p>}
          </div>

          <div className={card}>
            <h2 className="mb-2 font-semibold text-slate-900 dark:text-white">Dokumentasi perbaikan</h2>
            <div className="flex flex-wrap gap-3">
              {(evidence.data ?? []).map((e, i) => (
                <figure key={e.storage_path} className="text-xs text-slate-600 dark:text-slate-300">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={evUrls[i]} alt={`Bukti ${e.kind}`} className="h-32 w-44 rounded-lg object-cover" />
                  <figcaption>{e.kind === 'before' ? 'Sebelum' : e.kind === 'after' ? 'Sesudah' : 'Proses'}{e.repaired_at ? ` · ${e.repaired_at}` : ''}{e.note ? ` · ${e.note}` : ''}</figcaption>
                </figure>
              ))}
              {!evidence.data?.length && <p className="text-sm text-slate-500">Belum ada bukti.</p>}
            </div>
            {['terverifikasi', 'dalam_penanganan', 'selesai'].includes(report.status) && (
              <form action={uploadEvidence} className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                <input type="hidden" name="reportId" value={id} />
                <label className="text-sm">Jenis
                  <select name="kind" className={`${input} mt-1`}><option value="before">Sebelum</option><option value="progress">Proses</option><option value="after">Sesudah</option></select>
                </label>
                <label className="text-sm">Foto<input name="file" type="file" accept="image/jpeg,image/png,image/webp" required className={`${input} mt-1`} /></label>
                <label className="text-sm">Tanggal perbaikan<input name="repairedAt" type="date" className={`${input} mt-1`} /></label>
                <label className="text-sm">Catatan<input name="note" maxLength={1000} className={`${input} mt-1`} /></label>
                <button className={btn}>Unggah bukti</button>
              </form>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className={card}>
            <h2 className="mb-2 font-semibold text-slate-900 dark:text-white">Tindakan status</h2>
            {options.length === 0 ? <p className="text-sm text-slate-500">Tidak ada tindakan tersedia.</p> : (
              <form action={changeStatus} className="space-y-2">
                <input type="hidden" name="reportId" value={id} />
                <input type="hidden" name="from" value={report.status} />
                <label className="block text-sm">Catatan (wajib untuk penolakan)
                  <textarea name="note" rows={3} maxLength={1000} className={`${input} mt-1`} />
                </label>
                <div className="flex flex-wrap gap-2">
                  {options.map((s) => (
                    <button key={s} name="to" value={s} className={s === 'ditolak' ? 'rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700' : btn}>
                      {ACTION_LABEL[s]}
                    </button>
                  ))}
                </div>
              </form>
            )}
          </div>

          {isAdmin && (
            <div className={card}>
              <h2 className="mb-2 font-semibold text-slate-900 dark:text-white">Penugasan petugas</h2>
              <p className="mb-2 text-sm text-slate-500">Saat ini: {assignment.data ? 'ditugaskan' : 'belum ditugaskan'}</p>
              {officerList.length === 0 ? <p className="text-sm text-slate-500">Belum ada petugas pada instansi yang mencakup wilayah ini.</p> : (
                <form action={assignOfficer} className="flex gap-2">
                  <input type="hidden" name="reportId" value={id} />
                  <select name="officerId" className={input} required>
                    {officerList.map((o) => <option key={o.user_id} value={o.user_id}>{o.full_name} ({o.agency_name})</option>)}
                  </select>
                  <button className={btn}>Tugaskan</button>
                </form>
              )}
            </div>
          )}

          <div className={card}>
            <h2 className="mb-2 font-semibold text-slate-900 dark:text-white">Prioritas</h2>
            <ul className="mb-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              {(scores.data ?? []).map((s, i) => (
                <li key={i} className="border-b border-slate-100 pb-1 dark:border-slate-700">
                  <b>{s.level}</b> ({Number(s.score)}) · {s.is_override ? `override: ${s.override_reason}` : `model ${s.config_version}`} · {fmtDate(s.calculated_at)}
                  {!s.is_override && s.factors && <div>Faktor: {Object.entries(s.factors as Record<string, number | null>).map(([k, v]) => `${k}=${v ?? 'n/a'}`).join(', ')}</div>}
                </li>
              ))}
            </ul>
            {isAdmin && (
              <form action={overridePriority} className="space-y-2">
                <input type="hidden" name="reportId" value={id} />
                <div className="flex gap-2">
                  <select name="level" className={input} defaultValue={report.priority_level ?? 'sedang'}>
                    {PRIORITY_LEVELS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <input name="score" type="number" min={0} max={100} step="0.01" defaultValue={Number(report.priority_score ?? 50)} className={input} aria-label="Skor 0-100" />
                </div>
                <textarea name="reason" rows={2} required minLength={10} placeholder="Alasan penggantian (min. 10 karakter)" className={input} />
                <button className={btnGhost}>Ganti prioritas</button>
              </form>
            )}
          </div>

          <div className={card}>
            <h2 className="mb-2 font-semibold text-slate-900 dark:text-white">Riwayat status</h2>
            <ol className="space-y-2 text-sm">
              {(history.data ?? []).map((h, i) => (
                <li key={i}>
                  <b>{labelOf(REPORT_STATUSES, h.to_status)}</b> <span className="text-xs text-slate-500">{fmtDate(h.created_at)}</span>
                  {h.note && <div className="text-slate-600 dark:text-slate-300">{h.note}</div>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
