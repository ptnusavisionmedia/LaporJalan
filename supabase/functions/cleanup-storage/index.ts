// Removes storage objects that no report/evidence row references (failed uploads).
// Schedule daily; protected by CRON_INTERNAL_TOKEN. Untested: needs a deployed project.
import { createClient } from 'npm:@supabase/supabase-js@2';

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
  const { data, error } = await db.rpc('orphaned_storage_objects', { p_min_age: '24 hours' });
  if (error) {
    console.error('orphan query failed', error.message);
    return new Response('query_error', { status: 500 });
  }
  const byBucket = new Map<string, string[]>();
  for (const o of (data ?? []) as { bucket: string; name: string }[]) {
    byBucket.set(o.bucket, [...(byBucket.get(o.bucket) ?? []), o.name]);
  }
  let removed = 0;
  for (const [bucket, names] of byBucket) {
    const { error: rmErr } = await db.storage.from(bucket).remove(names);
    if (rmErr) console.error('remove failed', bucket, rmErr.message);
    else removed += names.length;
  }
  console.log(JSON.stringify({ event: 'cleanup_storage', removed }));
  return Response.json({ removed });
});
