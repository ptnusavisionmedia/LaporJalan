import { loginSchema } from '@laporjalan/shared';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

async function signIn(formData: FormData) {
  'use server';
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) redirect('/login?error=invalid');

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  // A single generic error avoids revealing which emails exist.
  if (error) redirect('/login?error=invalid');
  redirect('/dashboard'); // requireStaff() then rejects non-staff accounts
}

const MESSAGES: Record<string, string> = {
  invalid: 'Email atau kata sandi salah.',
  forbidden: 'Akun ini tidak memiliki akses ke dasbor administrasi.',
};

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const { error } = await searchParams;
  const message = typeof error === 'string' ? MESSAGES[error] : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-900">
      <form
        action={signIn}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800"
      >
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">LaporJalan Admin</h1>
        <p className="text-sm text-slate-500">Masuk dengan akun petugas atau administrator.</p>

        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Email
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-slate-900"
          />
        </label>
        <label className="block text-sm font-medium text-slate-900 dark:text-slate-100">
          Kata sandi
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 dark:bg-slate-900"
          />
        </label>

        {message ? (
          <p role="alert" className="text-sm text-red-600">
            {message}
          </p>
        ) : null}

        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
        >
          Masuk
        </button>
      </form>
    </main>
  );
}
