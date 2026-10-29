import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { btnGhost } from '@/lib/ui';

// Only pages that exist are linked. Not yet built: /map, /officers, /users,
// /notifications, /settings (see docs/PRODUCTION_CHECKLIST.md).
const NAV = [
  { href: '/dashboard', label: 'Dasbor', superOnly: false },
  { href: '/reports', label: 'Semua Laporan', superOnly: false },
  { href: '/priorities', label: 'Prioritas', superOnly: false },
  { href: '/reports/pending', label: 'Menunggu Verifikasi', superOnly: false },
  { href: '/reports/verified', label: 'Terverifikasi', superOnly: false },
  { href: '/reports/in-progress', label: 'Dalam Penanganan', superOnly: false },
  { href: '/reports/completed', label: 'Selesai', superOnly: false },
  { href: '/statistics/regions', label: 'Statistik Wilayah', superOnly: false },
  { href: '/agencies', label: 'Instansi & Anggota', superOnly: true },
  { href: '/audit-logs', label: 'Log Audit', superOnly: true },
];

async function signOut() {
  'use server';
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export default async function AdminLayout({ children }: LayoutProps<'/'>) {
  const staff = await requireStaff();
  // Hiding links is cosmetic; super-only pages enforce the role themselves.
  const items = NAV.filter((n) => !n.superOnly || staff.isSuperAdmin);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row dark:bg-slate-900">
      <aside className="shrink-0 border-b border-slate-200 bg-white p-4 md:w-60 md:border-b-0 md:border-r dark:border-slate-700 dark:bg-slate-800">
        <p className="mb-4 text-lg font-bold text-slate-900 dark:text-white">LaporJalan</p>
        <nav aria-label="Navigasi utama" className="flex flex-wrap gap-1 md:flex-col">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3 dark:border-slate-700 dark:bg-slate-800">
          <span className="text-sm text-slate-500">
            {staff.email} · {staff.roles.filter((r) => r !== 'user').join(', ')}
          </span>
          <form action={signOut}><button className={btnGhost}>Keluar</button></form>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
