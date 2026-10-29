import { REPORT_STATUSES, labelOf } from '@laporjalan/shared';

export const STATUS_COLOR: Record<string, string> = {
  diajukan: 'bg-slate-500',
  menunggu_verifikasi: 'bg-blue-600',
  terverifikasi: 'bg-blue-700',
  dalam_penanganan: 'bg-amber-500',
  selesai: 'bg-green-600',
  ditolak: 'bg-red-600',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${STATUS_COLOR[status] ?? 'bg-slate-500'}`}>
      {labelOf(REPORT_STATUSES, status)}
    </span>
  );
}

export const PRIORITY_COLOR: Record<string, string> = {
  rendah: 'bg-green-600', sedang: 'bg-yellow-500', tinggi: 'bg-amber-600', kritis: 'bg-red-600',
};

export function PriorityBadge({ level, score }: { level: string | null; score: number | null }) {
  if (!level) return <span className="text-slate-400">-</span>;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold text-white ${PRIORITY_COLOR[level]}`}>
      {level[0].toUpperCase() + level.slice(1)}{score != null ? ` (${Math.round(Number(score))})` : ''}
    </span>
  );
}

export const card = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800';
export const input = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white';
export const btn = 'rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50';
export const btnGhost = 'rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-700';

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });

export function ErrorBox({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-200">{message}</p>;
}
