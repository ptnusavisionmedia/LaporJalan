// Authenticated proxy to the AI service. The app never sees AI_SERVICE_INTERNAL_TOKEN.
// Untested: needs `supabase functions serve` + a running AI service (see docs/AI_SERVICE.md).
import { createClient } from 'npm:@supabase/supabase-js@2';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);
const HOURLY_LIMIT = 20;
const TIMEOUT_MS = 20_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const { data: auth } = await userClient.auth.getUser();
  if (!auth.user) return json({ error: 'unauthorized' }, 401);

  const aiUrl = Deno.env.get('AI_SERVICE_URL');
  const aiToken = Deno.env.get('AI_SERVICE_INTERNAL_TOKEN');
  if (!aiUrl || !aiToken) return json({ error: 'ai_unavailable' }, 503);

  // Rate limit per user (results are logged below, so the log doubles as the counter).
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from('ai_analysis_results').select('id', { count: 'exact', head: true })
    .eq('requested_by', auth.user.id).gte('created_at', since);
  if ((count ?? 0) >= HOURLY_LIMIT) return json({ error: 'rate_limited' }, 429);

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get('file');
    file = f instanceof File ? f : null;
  } catch {
    return json({ error: 'invalid_request' }, 400);
  }
  if (!file) return json({ error: 'file_required' }, 400);
  if (!ALLOWED.has(file.type)) return json({ error: 'unsupported_media_type' }, 415);
  if (file.size > MAX_BYTES) return json({ error: 'file_too_large' }, 413);

  const body = new FormData();
  body.append('file', file);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${aiUrl.replace(/\/$/, '')}/analyze`, { method: 'POST', body, headers: { 'X-Internal-Token': aiToken }, signal: ctrl.signal });
  } catch {
    return json({ error: 'ai_unavailable' }, 503); // timeout or network failure; the app continues without AI
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) return json({ error: res.status === 503 ? 'model_unavailable' : 'ai_failed' }, res.status === 503 ? 503 : 502);

  const result = await res.json();
  await admin.from('ai_analysis_results').insert({
    requested_by: auth.user.id,
    predicted_category: result.category,
    confidence: result.confidence,
    severity_estimate: result.severity_estimate,
    boxes: result.boxes ?? [],
    model_version: result.model_version,
  });
  return json(result);
});
