'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const REGION_CODE = /^[0-9]{2}(\.[0-9]{2}(\.[0-9]{2}(\.[0-9]{4})?)?)?$/;
const to = (kind: 'ok' | 'error', msg: string): never => redirect(`/agencies?${kind}=${encodeURIComponent(msg)}`);

const agencySchema = z.object({
  name: z.string().trim().min(2, 'Nama instansi minimal 2 karakter').max(150),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{2,30}$/, 'Kode: 2-30 karakter huruf besar, angka, - atau _'),
  codes: z.array(z.string().regex(REGION_CODE, 'Kode wilayah tidak valid')).min(1, 'Isi minimal satu kode wilayah'),
});

// Both actions run as the caller: RLS (agencies_write) and add_agency_member() re-check super_admin.
export async function createAgency(formData: FormData) {
  await requireStaff(['super_admin']);
  const parsed = agencySchema.safeParse({
    name: formData.get('name'),
    code: formData.get('code'),
    codes: String(formData.get('codes') ?? '').split(/[\s,;]+/).filter(Boolean),
  });
  if (!parsed.success) return to('error', parsed.error.issues[0].message);

  const supabase = await createClient();
  const { data: found } = await supabase.from('regions').select('code').in('code', parsed.data.codes);
  const missing = parsed.data.codes.filter((c) => !found?.some((f) => f.code === c));
  if (missing.length) return to('error', `Kode wilayah tidak ada di database: ${missing.join(', ')}`);

  const { error } = await supabase.from('agencies').insert({
    name: parsed.data.name, code: parsed.data.code, jurisdiction_codes: parsed.data.codes,
  });
  if (error) return to('error', error.code === '23505' ? 'Kode instansi sudah dipakai.' : 'Gagal menyimpan instansi.');
  revalidatePath('/agencies');
  to('ok', 'Instansi dibuat.');
}

export async function addMember(formData: FormData) {
  await requireStaff(['super_admin']);
  const parsed = z.object({
    agencyId: z.string().uuid(),
    email: z.string().trim().email('Email tidak valid'),
    role: z.enum(['admin_daerah', 'petugas']),
  }).safeParse({ agencyId: formData.get('agencyId'), email: formData.get('email'), role: formData.get('role') });
  if (!parsed.success) return to('error', parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.rpc('add_agency_member', {
    p_agency_id: parsed.data.agencyId, p_email: parsed.data.email, p_role: parsed.data.role,
  });
  if (error) {
    return to('error', error.message === 'user_not_found'
      ? 'Pengguna dengan email itu belum terdaftar. Minta mereka mendaftar di aplikasi dahulu.'
      : 'Gagal menambahkan anggota.');
  }
  revalidatePath('/agencies');
  to('ok', 'Anggota ditambahkan dan peran diberikan.');
}
