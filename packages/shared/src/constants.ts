// Values mirror the Postgres enums in supabase/migrations/20260101000001_schema.sql.

export const DAMAGE_CATEGORIES = [
  { value: 'jalan_berlubang', label: 'Jalan Berlubang', accessibility: false },
  { value: 'jalan_retak', label: 'Jalan Retak', accessibility: false },
  { value: 'jalan_ambles', label: 'Jalan Ambles', accessibility: false },
  { value: 'trotoar_rusak', label: 'Trotoar Rusak', accessibility: false },
  { value: 'trotoar_terhalang', label: 'Trotoar Terhalang', accessibility: true },
  { value: 'jalur_pemandu_rusak', label: 'Jalur Pemandu Disabilitas Rusak', accessibility: true },
  { value: 'akses_kursi_roda', label: 'Akses Kursi Roda Tidak Memadai', accessibility: true },
  { value: 'drainase_rusak', label: 'Drainase Rusak', accessibility: false },
  { value: 'lainnya', label: 'Kerusakan Infrastruktur Lainnya', accessibility: false },
] as const;
export type DamageCategory = (typeof DAMAGE_CATEGORIES)[number]['value'];

export const REPORT_STATUSES = [
  { value: 'diajukan', label: 'Diajukan' },
  { value: 'menunggu_verifikasi', label: 'Menunggu Verifikasi' },
  { value: 'terverifikasi', label: 'Terverifikasi' },
  { value: 'dalam_penanganan', label: 'Dalam Penanganan' },
  { value: 'selesai', label: 'Selesai' },
  { value: 'ditolak', label: 'Ditolak' },
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number]['value'];

export const SEVERITIES = [
  { value: 'low', label: 'Rendah', color: '#16A34A' },
  { value: 'medium', label: 'Sedang', color: '#EAB308' },
  { value: 'high', label: 'Tinggi', color: '#F59E0B' },
  { value: 'critical', label: 'Kritis', color: '#DC2626' },
] as const;
export type Severity = (typeof SEVERITIES)[number]['value'];

export const ACCESSIBILITY_IMPACTS = [
  { value: 'none', label: 'Tidak ada' },
  { value: 'low', label: 'Ringan' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Berat' },
] as const;
export type AccessibilityImpact = (typeof ACCESSIBILITY_IMPACTS)[number]['value'];

export const ROAD_CLASSES = [
  { value: 'nasional', label: 'Jalan Nasional' },
  { value: 'provinsi', label: 'Jalan Provinsi' },
  { value: 'kabupaten_kota', label: 'Jalan Kabupaten/Kota' },
  { value: 'desa', label: 'Jalan Desa' },
  { value: 'lingkungan', label: 'Jalan Lingkungan' },
  { value: 'tidak_diketahui', label: 'Tidak diketahui' },
] as const;

export const APP_ROLES = ['super_admin', 'admin_daerah', 'petugas', 'user'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const PRIORITY_LEVELS = [
  { value: 'rendah', label: 'Rendah' },
  { value: 'sedang', label: 'Sedang' },
  { value: 'tinggi', label: 'Tinggi' },
  { value: 'kritis', label: 'Kritis' },
] as const;

export const PHOTO_LIMITS = {
  maxCount: 5,
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
} as const;

// Approximate bounding box of Indonesia; the database enforces the same range.
export const INDONESIA_BOUNDS = { minLat: -11.5, maxLat: 6.5, minLng: 94.5, maxLng: 141.5 } as const;

export const labelOf = <T extends { value: string; label: string }>(
  list: readonly T[],
  value: string | null | undefined,
): string => list.find((i) => i.value === value)?.label ?? '-';
