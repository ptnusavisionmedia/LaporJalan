import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ErrorBox, btn, card, input } from '@/lib/ui';
import { addMember, createAgency } from './actions';

export default async function Agencies({ searchParams }: PageProps<'/agencies'>) {
  await requireStaff(['super_admin']);
  const sp = await searchParams;
  const supabase = await createClient();
  const [agencies, members] = await Promise.all([
    supabase.from('agencies').select('id,name,code,jurisdiction_codes').order('name'),
    supabase.from('agency_memberships').select('agency_id,user_id,member_role,profiles(full_name)'),
  ]);
  if (agencies.error) return <ErrorBox message="Gagal memuat instansi." />;
  const error = typeof sp.error === 'string' ? sp.error : undefined;
  const ok = typeof sp.ok === 'string' ? sp.ok : undefined;

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Instansi & Anggota</h1>
      {error && <ErrorBox message={error} />}
      {ok && <p role="status" className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">{ok}</p>}

      <form action={createAgency} className={`${card} flex flex-wrap items-end gap-3`}>
        <label className="text-sm">Nama<input name="name" required className={`${input} mt-1`} /></label>
        <label className="text-sm">Kode<input name="code" required placeholder="DPU-BDG" className={`${input} mt-1`} /></label>
        <label className="text-sm">Kode wilayah yurisdiksi (pisahkan koma)<input name="codes" required placeholder="32.73, 32.77" className={`${input} mt-1`} /></label>
        <button className={btn}>Buat instansi</button>
      </form>

      {(agencies.data ?? []).map((a) => {
        const ms = (members.data ?? []).filter((m) => m.agency_id === a.id);
        return (
          <div key={a.id} className={card}>
            <h2 className="font-semibold text-slate-900 dark:text-white">{a.name} <span className="font-mono text-xs text-slate-500">{a.code}</span></h2>
            <p className="text-sm text-slate-500">Yurisdiksi: {a.jurisdiction_codes.join(', ')}</p>
            <ul className="my-2 text-sm text-slate-800 dark:text-slate-200">
              {ms.length === 0 ? <li className="text-slate-500">Belum ada anggota.</li> : ms.map((m) => (
                <li key={m.user_id}>
                  {(m.profiles as unknown as { full_name: string } | null)?.full_name || m.user_id.slice(0, 8)} — {m.member_role}
                </li>
              ))}
            </ul>
            <form action={addMember} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="agencyId" value={a.id} />
              <input name="email" type="email" required placeholder="email pengguna terdaftar" className={`${input} max-w-xs`} aria-label="Email anggota" />
              <select name="role" className={`${input} max-w-40`} aria-label="Peran">
                <option value="petugas">Petugas</option>
                <option value="admin_daerah">Admin daerah</option>
              </select>
              <button className={btn}>Tambah anggota</button>
            </form>
          </div>
        );
      })}
    </section>
  );
}
