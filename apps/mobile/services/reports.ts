import type { CreateReportInput } from '@laporjalan/shared';
import { supabase } from './supabase';
import type { PickedPhoto } from './photos';
import type { RegionValue } from '@/components/RegionPicker';

export type ReportRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  severity: string;
  accessibility_impact: string;
  road_name: string | null;
  is_public: boolean;
  reporter_id: string | null;
  priority_level: string | null;
  created_at: string;
  updated_at: string;
};

const LIST_COLUMNS = 'id,title,category,status,severity,road_name,created_at';
const PAGE_SIZE = 15;

const uuid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });

/** Uploads one compressed photo to the private bucket under <user_id>/<uuid>.jpg. */
async function uploadPhoto(userId: string, photo: PickedPhoto) {
  const path = `${userId}/${uuid()}.jpg`;
  const body = await (await fetch(photo.uri)).arrayBuffer();
  const { error } = await supabase.storage
    .from('report-photos')
    .upload(path, body, { contentType: photo.mime_type, upsert: false });
  if (error) throw new Error('Gagal mengunggah foto. Periksa koneksi Anda dan coba lagi.');
  return { storage_path: path, mime_type: photo.mime_type, size_bytes: photo.size_bytes, width: photo.width, height: photo.height };
}

/**
 * Upload photos, then create the report in one RPC. `idempotencyKey` is generated once per
 * form so a retry after a flaky network returns the same report instead of a duplicate.
 */
export async function submitReport(
  input: Omit<CreateReportInput, 'photos'>,
  photos: PickedPhoto[],
  region: RegionValue,
  idempotencyKey: string,
): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error('Sesi berakhir. Silakan masuk kembali.');

  const uploaded: Awaited<ReturnType<typeof uploadPhoto>>[] = [];
  try {
    for (const p of photos) uploaded.push(await uploadPhoto(auth.user.id, p));
    const { data, error } = await supabase.rpc('create_report', {
      p_title: input.title,
      p_description: input.description,
      p_category: input.category,
      p_lat: input.lat,
      p_lng: input.lng,
      p_severity: input.severity,
      p_accessibility: input.accessibilityImpact,
      p_province_code: region.province,
      p_regency_code: region.regency,
      p_district_code: region.district,
      p_village_code: region.village,
      p_road_name: input.roadName ?? null,
      p_road_class: null,
      p_idempotency_key: idempotencyKey,
      p_photos: uploaded,
    });
    if (error) throw error;
    return data as string;
  } catch (e) {
    // Best effort cleanup of photos that never got attached to a report. Clients have no
    // DELETE policy, so orphans are also swept by a server-side job (see docs).
    const msg = (e as { message?: string })?.message ?? '';
    if (msg === 'rate_limited') throw new Error('Terlalu banyak laporan hari ini. Coba lagi besok.');
    if (msg === 'invalid_region') throw new Error('Data wilayah tidak valid. Pilih ulang wilayah lokasi kerusakan.');
    if (msg === 'location_outside_indonesia') throw new Error('Lokasi berada di luar wilayah Indonesia.');
    // Errors we threw ourselves (upload) are already user-facing Indonesian messages.
    if (e instanceof Error) throw e;
    throw new Error('Gagal mengirim laporan. Coba lagi.');
  }
}

export async function fetchMyReports(userId: string, page: number) {
  const from = page * PAGE_SIZE;
  const { data, error } = await supabase
    .from('reports')
    .select(LIST_COLUMNS)
    .eq('reporter_id', userId)
    .order('created_at', { ascending: false })
    .range(from, from + PAGE_SIZE - 1);
  if (error) throw error;
  return { rows: data ?? [], next: (data?.length ?? 0) === PAGE_SIZE ? page + 1 : null };
}

export async function fetchMyStats(userId: string) {
  const count = async (statuses?: string[]) => {
    let q = supabase.from('reports').select('id', { count: 'exact', head: true }).eq('reporter_id', userId);
    if (statuses) q = q.in('status', statuses);
    const { count: c, error } = await q;
    if (error) throw error;
    return c ?? 0;
  };
  const [total, verified, completed] = await Promise.all([
    count(),
    count(['terverifikasi', 'dalam_penanganan', 'selesai']),
    count(['selesai']),
  ]);
  return { total, verified, completed };
}

export async function fetchNearby(lat: number, lng: number, radius = 2000) {
  const { data, error } = await supabase.rpc('nearby_reports', { p_lat: lat, p_lng: lng, p_radius_m: radius, p_limit: 20 });
  if (error) throw error;
  return (data ?? []) as {
    id: string; title: string; category: string; severity: string; status: string;
    road_name: string | null; distance_m: number; confirm_count: number; created_at: string;
  }[];
}

async function signed(bucket: string, paths: string[]) {
  if (paths.length === 0) return [] as string[];
  const { data } = await supabase.storage.from(bucket).createSignedUrls(paths, 3600);
  return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u);
}

export async function fetchReportDetail(id: string, userId: string) {
  const [report, photos, history, evidence, confirms, mine] = await Promise.all([
    supabase.from('reports').select('*').eq('id', id).single(),
    supabase.from('report_photos').select('storage_path').eq('report_id', id),
    supabase.from('report_status_history').select('to_status,note,created_at').eq('report_id', id).order('created_at'),
    supabase.from('repair_evidence').select('kind,storage_path,note,repaired_at').eq('report_id', id),
    supabase.from('report_confirmations').select('type,updated_at').eq('report_id', id),
    supabase.from('report_confirmations').select('type').eq('report_id', id).eq('user_id', userId).maybeSingle(),
  ]);
  if (report.error) throw report.error;

  const evidenceRows = evidence.data ?? [];
  const evidenceUrls = await signed('repair-evidence', evidenceRows.map((e) => e.storage_path));
  const conf = confirms.data ?? [];
  return {
    report: report.data as ReportRow,
    photoUrls: await signed('report-photos', (photos.data ?? []).map((p) => p.storage_path)),
    history: (history.data ?? []) as { to_status: string; note: string | null; created_at: string }[],
    evidence: evidenceRows.map((e, i) => ({ ...e, url: evidenceUrls[i] })),
    stillExists: conf.filter((c) => c.type === 'still_exists').length,
    repaired: conf.filter((c) => c.type === 'repaired').length,
    lastConfirmedAt: conf.map((c) => c.updated_at).sort().at(-1) ?? null,
    myConfirmation: (mine.data?.type as string | undefined) ?? null,
  };
}

export async function confirmReport(reportId: string, type: 'still_exists' | 'repaired') {
  const { error } = await supabase.rpc('confirm_report', { p_report_id: reportId, p_type: type });
  if (error) {
    if (error.message.includes('cannot_confirm_own_report')) throw new Error('Anda tidak dapat memvalidasi laporan sendiri.');
    throw new Error('Gagal menyimpan konfirmasi. Coba lagi.');
  }
}

export type MapReport = {
  id: string; title: string; category: string; severity: string; status: string;
  lat: number; lng: number; priority_level: string | null; created_at: string;
};

/** Only the visible viewport is fetched (PostGIS bbox + GiST index), capped at 300 rows. */
export async function fetchBbox(
  b: { minLng: number; minLat: number; maxLng: number; maxLat: number },
  filters: { severities: string[]; includeRepaired: boolean },
) {
  const statuses = ['terverifikasi', 'dalam_penanganan', ...(filters.includeRepaired ? ['selesai'] : [])];
  const { data, error } = await supabase.rpc('reports_in_bbox', {
    p_min_lng: b.minLng, p_min_lat: b.minLat, p_max_lng: b.maxLng, p_max_lat: b.maxLat,
    p_categories: null,
    p_severities: filters.severities.length ? filters.severities : null,
    p_statuses: statuses,
    p_limit: 300,
  });
  if (error) throw error;
  return (data ?? []) as MapReport[];
}

export { uuid };
