import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

export const isConfigured = url.startsWith('http') && anonKey.length > 20

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder')

// Username dipetakan ke email internal (sama dengan aplikasi mobile).
export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@laporjalan.app`

export type Status = 'menunggu' | 'diverifikasi' | 'diproses' | 'selesai' | 'ditolak'
export const STATUSES: Status[] = ['menunggu', 'diverifikasi', 'diproses', 'selesai', 'ditolak']
export const STATUS_LABEL: Record<Status, string> = {
  menunggu: 'Menunggu',
  diverifikasi: 'Diverifikasi',
  diproses: 'Diproses',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
}
export const STATUS_COLOR: Record<Status, string> = {
  menunggu: '#f59e0b',
  diverifikasi: '#8b5cf6',
  diproses: '#3b82f6',
  selesai: '#22c55e',
  ditolak: '#9ca3af',
}

export type Category =
  | 'jalan_berlubang'
  | 'jalan_rusak'
  | 'trotoar_rusak'
  | 'area_berbahaya'
  | 'trotoar_terhalang'
  | 'jalur_pemandu_rusak'
  | 'akses_kursi_roda'

export const CATEGORY_LABEL: Record<Category, string> = {
  jalan_berlubang: 'Jalan berlubang',
  jalan_rusak: 'Jalan rusak/retak',
  trotoar_rusak: 'Trotoar rusak',
  area_berbahaya: 'Area berbahaya',
  trotoar_terhalang: 'Trotoar terhalang (aksesibilitas)',
  jalur_pemandu_rusak: 'Jalur pemandu rusak (aksesibilitas)',
  akses_kursi_roda: 'Akses kursi roda kurang (aksesibilitas)',
}
export const CATEGORIES = Object.keys(CATEGORY_LABEL) as Category[]
export const isAccess = (c: Category) =>
  c === 'trotoar_terhalang' || c === 'jalur_pemandu_rusak' || c === 'akses_kursi_roda'

export const SEVERITY_LABEL: Record<number, string> = { 1: 'Ringan', 2: 'Sedang', 3: 'Berat' }

export function priorityLevel(score: number): { label: string; cls: string } {
  if (score >= 80) return { label: 'Tinggi', cls: 'p-high' }
  if (score >= 50) return { label: 'Sedang', cls: 'p-mid' }
  return { label: 'Rendah', cls: 'p-low' }
}

export interface Report {
  id: string
  user_id: string
  title: string
  description: string
  address: string
  latitude: number | null
  longitude: number | null
  image_url: string
  status: Status
  admin_note: string | null
  category: Category
  severity: 1 | 2 | 3
  traffic: 'rendah' | 'sedang' | 'tinggi'
  province: string
  city: string
  district: string
  village: string
  ai_category: string | null
  ai_severity: number | null
  ai_confidence: number | null
  ai_summary: string | null
  priority_score: number
  created_at: string
  profiles: { username: string } | null
  likes: { count: number }[]
  comments: { count: number }[]
  validations: { user_id: string; still_damaged: boolean }[]
}

export interface Comment {
  id: string
  body: string
  created_at: string
  profiles: { username: string } | null
}

export interface ReportUpdate {
  id: string
  kind: 'status' | 'progress' | 'after'
  status: Status | null
  note: string
  photo_url: string | null
  created_at: string
  profiles: { username: string } | null
}

export type ScopeLevel = 'nasional' | 'provinsi' | 'kota' | 'kecamatan' | 'kelurahan'
export const SCOPE_LABEL: Record<ScopeLevel, string> = {
  nasional: 'Nasional (semua wilayah)',
  provinsi: 'Provinsi',
  kota: 'Kabupaten/Kota',
  kecamatan: 'Kecamatan',
  kelurahan: 'Desa/Kelurahan',
}

export interface Profile {
  id: string
  username: string
  role: 'user' | 'admin' | 'instansi'
  agency_name: string | null
  scope_level: ScopeLevel
  scope_value: string | null
  created_at: string
}

/** Apakah laporan ada dalam wilayah kewenangan akun ini? (admin = semua) */
export function inScope(r: Report, p: Profile): boolean {
  if (p.role === 'admin' || p.scope_level === 'nasional') return true
  const v = (p.scope_value ?? '').trim().toLowerCase()
  const field = { provinsi: r.province, kota: r.city, kecamatan: r.district, kelurahan: r.village }[p.scope_level]
  return field.trim().toLowerCase() === v
}

export const REPORT_SELECT =
  '*, profiles!reports_user_id_fkey(username), likes(count), comments(count), validations(user_id, still_damaged)'

export async function fetchReports(profile: Profile): Promise<Report[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(REPORT_SELECT)
    .order('priority_score', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return ((data ?? []) as unknown as Report[]).filter((r) => inScope(r, profile))
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
