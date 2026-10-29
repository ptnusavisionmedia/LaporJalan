// Delivers queued rows of public.notifications as push messages via the Expo push service
// (which relays to FCM using credentials stored in EAS, never in the app or this repo).
// Invoke on a schedule or from a Database Webhook; see docs/ADMIN_DEPLOYMENT.md.
// Untested: needs a deployed project, a development build and an FCM-configured EAS project.
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_ATTEMPTS = 5;
const BATCH = 100;

type Notif = { id: string; user_id: string; title: string; body: string; data: unknown; push_attempts: number };
type Ticket = { status: 'ok' | 'error'; details?: { error?: string } };

const eq = (a: string, b: string) => {
  // constant-time compare
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_INTERNAL_TOKEN') ?? '';
  const given = req.headers.get('x-internal-token') ?? '';
  if (!secret || !eq(given, secret)) return new Response('unauthorized', { status: 401 }); // fail closed

  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: queue, error } = await db.from('notifications')
    .select('id,user_id,title,body,data,push_attempts')
    .is('pushed_at', null).lt('push_attempts', MAX_ATTEMPTS)
    .order('created_at').limit(BATCH);
  if (error) {
    console.error('queue read failed', error.message);
    return new Response('queue_error', { status: 500 });
  }

  const stats = { sent: 0, no_device: 0, failed: 0 };
  for (const n of (queue ?? []) as Notif[]) {
    const { data: tokens } = await db.from('device_tokens').select('token').eq('user_id', n.user_id);
    if (!tokens?.length) {
      // nothing to deliver to; the in-app list still shows it
      await db.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', n.id);
      stats.no_device++;
      continue;
    }
    const messages = tokens.map((t) => ({ to: t.token, title: n.title, body: n.body, data: n.data, channelId: 'default' }));
    let delivered = false;
    try {
      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(messages),
      });
      if (res.ok) {
        const { data: tickets } = (await res.json()) as { data: Ticket[] };
        tickets.forEach((t, i) => {
          if (t.status === 'ok') delivered = true;
          else if (t.details?.error === 'DeviceNotRegistered') {
            // stale token: drop it so we stop retrying
            db.from('device_tokens').delete().eq('token', tokens[i].token).then(() => {});
          }
        });
      }
    } catch (e) {
      console.error('push request failed', n.id, (e as Error).message);
    }
    if (delivered) {
      await db.from('notifications').update({ pushed_at: new Date().toISOString() }).eq('id', n.id);
      stats.sent++;
    } else {
      await db.from('notifications').update({ push_attempts: n.push_attempts + 1 }).eq('id', n.id);
      stats.failed++;
    }
  }
  console.log(JSON.stringify({ event: 'push_run', ...stats }));
  return Response.json(stats);
});
