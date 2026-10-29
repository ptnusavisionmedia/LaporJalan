# Layanan AI

`services/ai-service` (FastAPI). Dipanggil **hanya** oleh Edge Function `analyze`, yang memverifikasi login pengguna, membatasi 20 permintaan/jam/pengguna, dan menyimpan hasil ke `ai_analysis_results`. Aplikasi tidak pernah memegang `AI_SERVICE_INTERNAL_TOKEN`.

## Status

| Hal | Status |
|---|---|
| Kontrak API, validasi, autentikasi token (gagal-tertutup), 503 saat model tidak ada | Ditulis |
| Tes `tests/test_api.py` (11 kasus) | **Belum dijalankan** - Python tidak terpasang di mesin pengembangan |
| Inferensi nyata | **Tidak ada**: repositori tidak menyertakan bobot model |
| Edge Function `analyze` | Ditulis, belum diuji |

Tanpa bobot, `/analyze` menjawab `503 model_unavailable`. Layanan **tidak pernah** mengembalikan prediksi acak/palsu; aplikasi menampilkan "Analisis AI sedang tidak tersedia" dan pelaporan tetap berjalan.

## Kontrak

`POST /analyze` (multipart `file`, header `X-Internal-Token`) ->

```json
{ "category": "pothole|road_crack|surface_damage|sidewalk_damage|none",
  "confidence": 0.91, "severity_estimate": "high",
  "boxes": [{"label":"pothole","raw_label":"D40","confidence":0.91,"x":10,"y":20,"w":120,"h":90}],
  "model_version": "damage.pt", "note": "Keparahan hanya estimasi dan perlu ditinjau petugas." }
```

Kode galat: 401 token, 413 >5 MB, 415 tipe, 422 bukan gambar valid, 503 model tidak ada. `GET /health` melaporkan `degraded` bila bobot tidak dimuat.

## Lisensi (baca sebelum deploy)

- `ultralytics` berlisensi **AGPL-3.0** (atau lisensi enterprise berbayar); melayani modelnya lewat jaringan memicu kewajiban membuka kode. Karena itu tidak ada di `requirements.txt`; hanya di `requirements-ultralytics.txt`.
- Lisensi **bobot** dan **dataset latih** terpisah dari lisensi paket. Periksa keduanya untuk penggunaan Anda.
- Pemetaan kelas bawaan mengasumsikan label gaya RDD2022 (D00/D10/D20 retak, D40 lubang). Dataset itu **tidak mencakup kerusakan trotoar**; kategori `sidewalk_damage` hanya muncul bila Anda menyediakan `CLASS_MAP_PATH` kustom dengan model yang memang dilatih untuk itu.
- Estimasi keparahan adalah heuristik luas-kotak/keyakinan, bukan hasil yang divalidasi.

## Menjalankan

```bash
cd services/ai-service
python -m venv .venv && . .venv/Scripts/activate
pip install -r requirements-dev.txt && pytest
# dengan model (setelah memeriksa lisensi):
pip install -r requirements-ultralytics.txt
AI_SERVICE_INTERNAL_TOKEN=... MODEL_PATH=models/damage.pt uvicorn app.main:app --port 8000
```

Edge Function: `supabase secrets set AI_SERVICE_URL=... AI_SERVICE_INTERNAL_TOKEN=...` lalu `supabase functions deploy analyze`.
