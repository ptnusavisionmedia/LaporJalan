import type { IconName } from '../components/Icon';
import type { Category, Report, Status, Traffic } from './types';

// Identitas: papan petunjuk jalan raya. Hijau tua + putih; kuning hanya untuk peringatan.
export const colors = {
  primary: '#0B5D4B',
  primaryDark: '#06372D',
  primarySoft: '#E2EFEA',
  warn: '#F2B705',
  blue: '#1F5FAE',
  pink: '#C8362B', // dipakai untuk "suka"
  ink: '#16201D',
  text: '#33413C',
  muted: '#62716B',
  line: '#D9DFDC',
  bg: '#F2F4F3',
  card: '#FFFFFF',
  danger: '#C8362B',
};

export const fonts = {
  display: 'BarlowSemiCondensed_600SemiBold',
  displayBold: 'BarlowSemiCondensed_700Bold',
};

export const STATUSES: Status[] = ['menunggu', 'diverifikasi', 'diproses', 'selesai', 'ditolak'];

export const statusMeta: Record<Status, { label: string; color: string; bg: string; pin: string }> = {
  menunggu: { label: 'Menunggu', color: '#7A5600', bg: '#FBF0CF', pin: '#E2A912' },
  diverifikasi: { label: 'Diverifikasi', color: '#453D9A', bg: '#E8E6F8', pin: '#6C5FD0' },
  diproses: { label: 'Diproses', color: '#1A4F90', bg: '#DDE9F8', pin: '#3B82C4' },
  selesai: { label: 'Selesai', color: '#0B5D4B', bg: '#DCEFE6', pin: '#1F9D77' },
  ditolak: { label: 'Ditolak', color: '#55615C', bg: '#E8EBEA', pin: '#9AA5A0' },
};

export const categoryMeta: Record<Category, { label: string; icon: IconName; access: boolean }> = {
  jalan_berlubang: { label: 'Jalan berlubang', icon: 'jalan-berlubang', access: false },
  jalan_rusak: { label: 'Jalan rusak/retak', icon: 'jalan-retak', access: false },
  trotoar_rusak: { label: 'Trotoar rusak', icon: 'trotoar-rusak', access: false },
  area_berbahaya: { label: 'Area berbahaya', icon: 'area-berbahaya', access: false },
  trotoar_terhalang: { label: 'Trotoar terhalang', icon: 'trotoar-terhalang', access: true },
  jalur_pemandu_rusak: { label: 'Jalur pemandu rusak', icon: 'jalur-pemandu', access: true },
  akses_kursi_roda: { label: 'Akses kursi roda kurang', icon: 'akses-kursi-roda', access: true },
};

export const CATEGORIES = Object.keys(categoryMeta) as Category[];

export const severityMeta: Record<number, { label: string; color: string }> = {
  1: { label: 'Ringan', color: '#16A34A' },
  2: { label: 'Sedang', color: '#D97706' },
  3: { label: 'Berat', color: '#DC2626' },
};

export const TRAFFICS: Traffic[] = ['rendah', 'sedang', 'tinggi'];

export function priorityLevel(score: number): { label: string; color: string; bg: string } {
  if (score >= 80) return { label: 'Prioritas tinggi', color: '#FFFFFF', bg: '#C8362B' };
  if (score >= 50) return { label: 'Prioritas sedang', color: '#7A5600', bg: '#FBF0CF' };
  return { label: 'Prioritas rendah', color: '#0B5D4B', bg: '#DCEFE6' };
}

export function stillDamagedCount(r: Pick<Report, 'validations'>) {
  return r.validations.filter((v) => v.still_damaged).length;
}
export function fixedCount(r: Pick<Report, 'validations'>) {
  return r.validations.filter((v) => !v.still_damaged).length;
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'baru saja';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} hari lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Jarak dua titik dalam meter (rumus haversine). */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
