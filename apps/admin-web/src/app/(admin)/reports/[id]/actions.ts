'use server';

import { priorityOverrideSchema, statusChangeSchema } from '@laporjalan/shared';
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import sharp from 'sharp';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

// Authorization is enforced inside the SECURITY DEFINER RPCs (role + jurisdiction).
// requireStaff() here only rejects non-staff early; it is not the security boundary.
const ERRORS: Record<string, string> = {
  forbidden: 'Anda tidak berwenang melakukan tindakan ini pada laporan tersebut.',
  forbidden_transition: 'Petugas hanya dapat memulai penanganan laporan yang sudah terverifikasi.',
  invalid_transition: 'Perubahan status tersebut tidak diizinkan dari status saat ini.',
  status_conflict: 'Status laporan sudah diubah pengguna lain. Muat ulang halaman.',
  rejection_note_required: 'Catatan alasan penolakan wajib diisi (minimal 5 karakter).',
  after_evidence_required: 'Unggah foto bukti "sesudah" sebelum menyelesaikan laporan.',
  officer_not_eligible: 'Petugas tidak berada pada instansi yang mencakup wilayah laporan.',
  override_reason_required: 'Alasan penggantian prioritas minimal 10 karakter.',
  report_not_in_repair_flow: 'Bukti perbaikan hanya dapat diunggah setelah laporan terverifikasi.',
};

const back = (id: string, kind: 'ok' | 'error', msg: string): never =>
  redirect(`/reports/${id}?${kind}=${encodeURIComponent(msg)}`);

const fail = (id: string, e: { message?: string } | null): never =>
  back(id, 'error', ERRORS[e?.message ?? ''] ?? 'Tindakan gagal. Coba lagi.');

export async function changeStatus(formData: FormData) {
  await requireStaff();
  const parsed = statusChangeSchema.safeParse({
    reportId: formData.get('reportId'),
    to: formData.get('to'),
    note: (formData.get('note') as string) || undefined,
  });
  if (!parsed.success) return back(String(formData.get('reportId')), 'error', 'Data tidak valid.');
  const { reportId, to, note } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.rpc('change_report_status', {
    p_report_id: reportId, p_to: to, p_note: note ?? null,
    p_expected_from: (formData.get('from') as string) || null,
  });
  if (error) return fail(reportId, error);
  revalidatePath(`/reports/${reportId}`);
  back(reportId, 'ok', 'Status laporan diperbarui.');
}

export async function assignOfficer(formData: FormData) {
  await requireStaff();
  const reportId = String(formData.get('reportId'));
  const officerId = String(formData.get('officerId'));
  const supabase = await createClient();
  const { error } = await supabase.rpc('assign_report', { p_report_id: reportId, p_officer_id: officerId });
  if (error) return fail(reportId, error);
  revalidatePath(`/reports/${reportId}`);
  back(reportId, 'ok', 'Petugas ditugaskan.');
}

export async function overridePriority(formData: FormData) {
  await requireStaff();
  const parsed = priorityOverrideSchema.safeParse({
    reportId: formData.get('reportId'),
    level: formData.get('level'),
    score: Number(formData.get('score')),
    reason: formData.get('reason'),
  });
  if (!parsed.success) return back(String(formData.get('reportId')), 'error', parsed.error.issues[0].message);
  const { reportId, level, score, reason } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc('override_priority', {
    p_report_id: reportId, p_level: level, p_score: score, p_reason: reason,
  });
  if (error) return fail(reportId, error);
  revalidatePath(`/reports/${reportId}`);
  back(reportId, 'ok', 'Prioritas diganti dan alasan dicatat.');
}

const MAX_BYTES = 8 * 1024 * 1024;
const MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function uploadEvidence(formData: FormData) {
  await requireStaff();
  const reportId = String(formData.get('reportId'));
  const kind = String(formData.get('kind'));
  const file = formData.get('file');
  if (!['before', 'progress', 'after'].includes(kind)) return back(reportId, 'error', 'Jenis bukti tidak valid.');
  if (!(file instanceof File) || file.size === 0) return back(reportId, 'error', 'Pilih berkas foto.');
  if (file.size > MAX_BYTES) return back(reportId, 'error', 'Ukuran foto maksimal 8 MB.');
  if (!MIME.has(file.type)) return back(reportId, 'error', 'Format harus JPEG, PNG, atau WebP.');

  // Never trust the declared type: sharp decodes the real content (throws on non-images),
  // then re-encodes to JPEG, which also strips EXIF/GPS metadata.
  let jpeg: Buffer;
  try {
    jpeg = await sharp(Buffer.from(await file.arrayBuffer()))
      .rotate().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 78 }).toBuffer();
  } catch {
    return back(reportId, 'error', 'Berkas bukan gambar yang valid.');
  }

  const supabase = await createClient();
  const path = `${reportId}/${randomUUID()}.jpg`;
  // Storage RLS (can_write_evidence) checks the caller may manage this report.
  const { error: upErr } = await supabase.storage.from('repair-evidence').upload(path, jpeg, { contentType: 'image/jpeg', upsert: false });
  if (upErr) return back(reportId, 'error', 'Unggahan ditolak atau gagal.');

  const { error } = await supabase.rpc('add_repair_evidence', {
    p_report_id: reportId, p_kind: kind, p_storage_path: path,
    p_note: (formData.get('note') as string) || null,
    p_repaired_at: (formData.get('repairedAt') as string) || null,
  });
  if (error) {
    await supabase.storage.from('repair-evidence').remove([path]).catch(() => {}); // may be denied; swept later
    return fail(reportId, error);
  }
  revalidatePath(`/reports/${reportId}`);
  back(reportId, 'ok', 'Bukti perbaikan diunggah.');
}
