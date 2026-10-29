import type { AppRole } from '@laporjalan/shared';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type StaffContext = {
  userId: string;
  email: string | undefined;
  roles: AppRole[];
  isSuperAdmin: boolean;
};

const STAFF_ROLES: AppRole[] = ['super_admin', 'admin_daerah', 'petugas'];

// Server-side gate for every admin page. getUser() validates the JWT with Supabase Auth
// (unlike getSession(), which only reads the cookie). Roles come from user_roles, which RLS
// limits to the caller's own rows; they can only be changed by a super admin via grant_role().
export async function requireStaff(allowed: AppRole[] = STAFF_ROLES): Promise<StaffContext> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect('/login');

  const { data: rows } = await supabase.from('user_roles').select('role').eq('user_id', auth.user.id);
  const roles = (rows ?? []).map((r) => r.role as AppRole);

  if (!roles.some((r) => allowed.includes(r))) {
    await supabase.auth.signOut();
    redirect('/login?error=forbidden');
  }
  return {
    userId: auth.user.id,
    email: auth.user.email,
    roles,
    isSuperAdmin: roles.includes('super_admin'),
  };
}
