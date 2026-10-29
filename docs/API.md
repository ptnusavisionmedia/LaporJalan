# API (kontrak logis)

Tidak ada server REST terpisah. Semua operasi memakai JWT pengguna; `anon` tidak punya akses tabel. Galat RPC berupa teks kode (mis. `forbidden`) yang dipetakan klien ke pesan Indonesia. **Belum ada yang diuji terhadap Supabase nyata.**

| Operasi logis | Implementasi | Otorisasi | Catatan |
|---|---|---|---|
| `POST /reports` | RPC `create_report(...)` | login | Zod di klien + validasi di DB (wilayah, koordinat, foto 1-5, 20/hari), `idempotency_key` |
| `GET /reports` | PostgREST `reports` (pelapor) / RPC `admin_list_reports` (staf) | RLS / peran | paginasi sisi server, maks 100/halaman |
| `GET /reports/:id` | PostgREST `reports` + `report_photos` + `report_status_history` + `repair_evidence` | RLS (`can_view_report`) | URL foto: signed URL 1 jam |
| `GET /reports/nearby` | RPC `nearby_reports(lat,lng,radius_m,limit,include_repaired)` | login, RLS | radius 50 m-20 km, maks 200 |
| (peta) | RPC `reports_in_bbox(...)` | login, RLS | maks 500 (klien meminta 300) |
| `POST /reports/:id/confirm` | RPC `confirm_report(id, type)` | login, bukan pelapor | satu baris/pengguna, riwayat perubahan di `report_confirmation_events` |
| `PATCH /reports/:id/status` | RPC `change_report_status(id,to,note,expected_from)` | admin yurisdiksi; petugas hanya mulai penanganan | atomik; transisi dibatasi |
| `POST /reports/:id/repair` | upload ke bucket `repair-evidence` + RPC `add_repair_evidence` | admin / petugas ditugaskan | |
| (admin) | `assign_report`, `override_priority`, `list_eligible_officers`, `report_context` | admin yurisdiksi | audit otomatis |
| `GET /statistics/overview` | RPC `overview_stats()` | RLS (terbatas yurisdiksi) | |
| `GET /statistics/regions` | RPC `regional_stats(level, parent)` | RLS | |
| `POST /ai/analyze` | Edge Function `analyze` (multipart `file`) -> FastAPI | login; 20/jam | 503 `model_unavailable` tanpa model |
| `POST /notifications/register` | RPC `register_device_token(token, platform)` | login | |
| (akun) | `accept_consent`, `export_my_data`, `request_account_deletion`, `cancel_account_deletion` | login | |
| (super admin) | `grant_role`, `revoke_role`, `add_agency_member`, `list_audit_logs` | `super_admin` | |
| (internal) | Edge Function `send-push`, `cleanup-storage`, `process-deletions` | header `x-internal-token` | gagal-tertutup bila rahasia kosong |

## Konvensi galat

Kode: `unauthenticated` (28000), `forbidden`/`forbidden_transition` (42501), `invalid_transition`/`invalid_region`/`location_outside_indonesia` (22023), `status_conflict` (40001), `rate_limited` (54000), `report_not_found`/`report_not_available` (P0002). Edge Function: JSON `{ "error": "<kode>" }` dengan status HTTP 4xx/5xx.

## Belum ada

Dokumen OpenAPI otomatis, pembatasan laju selain yang tercantum (mis. login, `confirm_report`), dan idempotensi untuk operasi selain `create_report`.
