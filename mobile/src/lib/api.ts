import { prepareReportImage } from './reportImage';
import { supabase } from './supabase';
import type { AiResult, Category, Comment, Report, ReportUpdate, Traffic } from './types';

const REPORT_SELECT =
  '*, profiles!reports_user_id_fkey(username), likes(user_id), comments(count), validations(user_id, still_damaged)';

/** Semua laporan yang punya koordinat (untuk peta & peringatan area). */
export async function fetchMapReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .not('latitude', 'is', null)
    .not('longitude', 'is', null)
    .order('priority_score', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as unknown as Report[];
}

/** still = true -> "masih rusak", false -> "sudah diperbaiki", null -> hapus suara. */
export async function setValidation(reportId: string, userId: string, still: boolean | null) {
  const { error } =
    still === null
      ? await supabase.from('validations').delete().eq('report_id', reportId).eq('user_id', userId)
      : await supabase
          .from('validations')
          .upsert({ report_id: reportId, user_id: userId, still_damaged: still }, { onConflict: 'report_id,user_id' });
  if (error) throw error;
}

export async function fetchUpdates(reportId: string): Promise<ReportUpdate[]> {
  const { data, error } = await supabase
    .from('report_updates')
    .select('*, profiles!report_updates_actor_id_fkey(username)')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as ReportUpdate[];
}

/** Analisis foto oleh AI (Edge Function). Mengembalikan null bila belum di-deploy / gagal. */
export async function analyzeImage(imageBase64: string): Promise<AiResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-report', {
      body: { image_base64: imageBase64, media_type: 'image/jpeg' },
    });
    if (error || !data || data.error) return null;
    return data as AiResult;
  } catch {
    return null;
  }
}

export async function fetchReports(userId?: string): Promise<Report[]> {
  let q = supabase.from('reports').select(REPORT_SELECT).order('created_at', { ascending: false });
  if (userId) q = q.eq('user_id', userId);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Report[];
}

export async function fetchReport(id: string): Promise<Report> {
  const { data, error } = await supabase.from('reports').select(REPORT_SELECT).eq('id', id).single();
  if (error) throw error;
  return data as unknown as Report;
}

export async function setLike(reportId: string, userId: string, like: boolean) {
  const { error } = like
    ? await supabase.from('likes').insert({ report_id: reportId, user_id: userId })
    : await supabase.from('likes').delete().eq('report_id', reportId).eq('user_id', userId);
  if (error) throw error;
}

export async function fetchComments(reportId: string): Promise<Comment[]> {
  const { data, error } = await supabase
    .from('comments')
    .select('*, profiles!comments_user_id_fkey(username)')
    .eq('report_id', reportId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Comment[];
}

export async function addComment(reportId: string, userId: string, body: string) {
  const { error } = await supabase.from('comments').insert({ report_id: reportId, user_id: userId, body });
  if (error) throw error;
}

export async function deleteComment(id: string) {
  const { error } = await supabase.from('comments').delete().eq('id', id);
  if (error) throw error;
}

export async function deleteReport(report: Report) {
  const { error } = await supabase.from('reports').delete().eq('id', report.id);
  if (error) throw error;
  const marker = '/report-images/';
  const idx = report.image_url.indexOf(marker);
  if (idx >= 0) {
    await supabase.storage.from('report-images').remove([report.image_url.slice(idx + marker.length)]);
  }
}

interface NewReport {
  userId: string;
  title: string;
  description: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  imageUri: string;
  imageBase64: string;
  category: Category;
  severity: 1 | 2 | 3;
  traffic: Traffic;
  province: string;
  city: string;
  district: string;
  village: string;
  ai: AiResult | null;
}

async function uploadReportImage(userId: string, imageBase64: string) {
  const { body, ext, contentType } = prepareReportImage(imageBase64);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const up = await supabase.storage
    .from('report-images')
    .upload(path, body, { contentType });
  if (up.error) throw up.error;
  const { data } = supabase.storage.from('report-images').getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export async function replaceReportImage(report: Report, userId: string, imageBase64: string) {
  if (report.user_id !== userId) throw new Error('Hanya pelapor yang dapat mengganti foto ini.');
  const { path, publicUrl } = await uploadReportImage(userId, imageBase64);
  const { data, error } = await supabase.from('reports')
    .update({ image_url: publicUrl }).eq('id', report.id).eq('user_id', userId).select('id').single();
  if (error || !data) {
    await supabase.storage.from('report-images').remove([path]);
    throw error ?? new Error('Foto laporan gagal diperbarui.');
  }
  return publicUrl;
}

export async function createReport(r: NewReport) {
  const { path, publicUrl } = await uploadReportImage(r.userId, r.imageBase64);
  const { error } = await supabase.from('reports').insert({
    user_id: r.userId,
    title: r.title,
    description: r.description,
    address: r.address,
    latitude: r.latitude,
    longitude: r.longitude,
    image_url: publicUrl,
    category: r.category,
    severity: r.severity,
    traffic: r.traffic,
    province: r.province,
    city: r.city,
    district: r.district,
    village: r.village,
    ai_category: r.ai?.category ?? null,
    ai_severity: r.ai?.severity ?? null,
    ai_confidence: r.ai?.confidence ?? null,
    ai_summary: r.ai?.summary ?? null,
  });
  if (error) {
    await supabase.storage.from('report-images').remove([path]);
    throw error;
  }
}
