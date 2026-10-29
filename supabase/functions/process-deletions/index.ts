// Executes account-deletion requests after a grace period (default 7 days).
// Reports are kept but detached from the person (anonymize_user); the auth user is then deleted.
// Schedule daily; protected by CRON_INTERNAL_TOKEN. Untested: needs a deployed project.
// NOTE: retention periods and the legal basis for keeping anonymised reports need legal review.
import { createClient } from 'npm:@supabase/supabase-js@2';

const GRACE_DAYS = Number(Deno.env.get('DELETION_GRACE_DAYS') ?? '7');

const same = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_INTERNAL_TOKEN') ?? '';
  if (!secret || !same(req.headers.get('x-internal-token') ?? '', secret)) return new Response('unauthorized', { status: 401 });

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const cutoff = new Date(Date.now() - GRACE_DAYS * 86_400_000).toISOString();
  const { data: due, error } = await db.from('profiles').select('id').not('deletion_requested_at', 'is', null)
    .lt('deletion_requested_at', cutoff).limit(20);
  if (error) {
    console.error('query failed', error.message);
    return new Response('query_error', { status: 500 });
  }

  const stats = { deleted: 0, failed: 0 };
  for (const { id } of due ?? []) {
    const { error: anonErr } = await db.rpc('anonymize_user', { p_user_id: id });
    if (anonErr) { console.error('anonymize failed', id, anonErr.message); stats.failed++; continue; }
    const { error: delErr } = await db.auth.admin.deleteUser(id);
    if (delErr) { console.error('auth delete failed', id, delErr.message); stats.failed++; continue; }
    stats.deleted++;
  }
  console.log(JSON.stringify({ event: 'process_deletions', ...stats }));
  return Response.json(stats);
});
