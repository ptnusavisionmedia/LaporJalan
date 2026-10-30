// Supabase Edge Function: analyze-report
// Menganalisis foto kerusakan jalan/trotoar dengan model Claude (vision) dan
// mengembalikan kategori + perkiraan tingkat keparahan sebagai SARAN untuk pelapor
// dan bahan pertimbangan admin (bukan keputusan akhir).
//
// Deploy:
//   supabase functions deploy analyze-report
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Fungsi ini memakai verifikasi JWT bawaan Supabase: hanya pengguna yang login yang bisa memanggilnya.

const CATEGORIES = [
  'jalan_berlubang',
  'jalan_rusak',
  'trotoar_rusak',
  'area_berbahaya',
  'trotoar_terhalang',
  'jalur_pemandu_rusak',
  'akses_kursi_roda',
  'bukan_kerusakan',
] as const;

const MODEL = Deno.env.get('ANALYZE_MODEL') ?? 'claude-haiku-5-5';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SYSTEM = `Kamu adalah asisten penilai kerusakan infrastruktur jalan di Indonesia.
Dari satu foto, tentukan:
- category: salah satu dari ${CATEGORIES.join(', ')}.
  jalan_berlubang = lubang/amblas di jalan; jalan_rusak = retak, bergelombang, aspal terkelupas;
  trotoar_rusak = trotoar pecah/amblas; area_berbahaya = bahaya lain (tiang miring, longsor, genangan dalam, tanpa pembatas);
  trotoar_terhalang = trotoar terhalang kendaraan/lapak/benda; jalur_pemandu_rusak = guiding block (jalur tunanetra) rusak/terhalang;
  akses_kursi_roda = tidak ada ramp/ramp curam/akses kursi roda tidak memadai; bukan_kerusakan = foto tidak menunjukkan masalah jalan/trotoar.
- severity: 1 ringan, 2 sedang, 3 berat (perhatikan ukuran, kedalaman, bahaya bagi pengendara/pejalan kaki/penyandang disabilitas).
- confidence: angka 0 sampai 1, seberapa yakin kamu.
- summary: 1-2 kalimat Bahasa Indonesia yang menjelaskan apa yang terlihat.
Jawab HANYA dengan satu objek JSON: {"category":"...","severity":1,"confidence":0.0,"summary":"..."}`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json({ error: 'ANTHROPIC_API_KEY belum diset di Supabase secrets.' }, 500);

  let image: string | undefined;
  let mediaType = 'image/jpeg';
  try {
    const body = await req.json();
    image = body.image_base64;
    if (body.media_type === 'image/png') mediaType = 'image/png';
  } catch {
    return json({ error: 'Body harus JSON.' }, 400);
  }
  if (!image || typeof image !== 'string') return json({ error: 'image_base64 wajib diisi.' }, 400);
  if (image.length > 6_000_000) return json({ error: 'Foto terlalu besar.' }, 413);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: image } },
            { type: 'text', text: 'Analisis foto ini.' },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    return json({ error: 'Layanan AI gagal merespons.', detail: detail.slice(0, 300) }, 502);
  }

  const data = await res.json();
  const text: string = data?.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '';
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return json({ error: 'Jawaban AI tidak bisa dibaca.' }, 502);

  try {
    const parsed = JSON.parse(match[0]);
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : 'jalan_rusak';
    const severity = [1, 2, 3].includes(Number(parsed.severity)) ? Number(parsed.severity) : 2;
    const confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0));
    const summary = String(parsed.summary ?? '').slice(0, 400);
    return json({ category, severity, confidence, summary });
  } catch {
    return json({ error: 'Jawaban AI tidak valid.' }, 502);
  }
});
