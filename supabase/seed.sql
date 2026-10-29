-- Reference/config data only. No fake reports or users.

-- Provinces (Kemendagri codes). Kabupaten/kota, kecamatan and desa must be imported from the
-- official Kemendagri/BPS dataset; see docs/DATABASE.md ("Mengimpor data wilayah").
insert into public.regions (code, name, level) values
  ('11', 'Aceh', 1), ('12', 'Sumatera Utara', 1), ('13', 'Sumatera Barat', 1), ('14', 'Riau', 1),
  ('15', 'Jambi', 1), ('16', 'Sumatera Selatan', 1), ('17', 'Bengkulu', 1), ('18', 'Lampung', 1),
  ('19', 'Kepulauan Bangka Belitung', 1), ('21', 'Kepulauan Riau', 1), ('31', 'DKI Jakarta', 1),
  ('32', 'Jawa Barat', 1), ('33', 'Jawa Tengah', 1), ('34', 'DI Yogyakarta', 1), ('35', 'Jawa Timur', 1),
  ('36', 'Banten', 1), ('51', 'Bali', 1), ('52', 'Nusa Tenggara Barat', 1), ('53', 'Nusa Tenggara Timur', 1),
  ('61', 'Kalimantan Barat', 1), ('62', 'Kalimantan Tengah', 1), ('63', 'Kalimantan Selatan', 1),
  ('64', 'Kalimantan Timur', 1), ('65', 'Kalimantan Utara', 1), ('71', 'Sulawesi Utara', 1),
  ('72', 'Sulawesi Tengah', 1), ('73', 'Sulawesi Selatan', 1), ('74', 'Sulawesi Tenggara', 1),
  ('75', 'Gorontalo', 1), ('76', 'Sulawesi Barat', 1), ('81', 'Maluku', 1), ('82', 'Maluku Utara', 1),
  ('91', 'Papua', 1), ('92', 'Papua Barat', 1), ('93', 'Papua Selatan', 1), ('94', 'Papua Tengah', 1),
  ('95', 'Papua Pegunungan', 1), ('96', 'Papua Barat Daya', 1)
on conflict (code) do nothing;

-- Provisional priority model. These weights/thresholds are design assumptions, NOT validated
-- coefficients, and must be evaluated before operational use. Traffic density is disabled
-- because no reliable data source exists; missing traffic is never treated as zero.
insert into public.app_settings (key, value) values (
  'priority_config',
  '{
    "version": "v1-provisional",
    "weights": {"severity": 0.35, "community": 0.15, "road": 0.15, "accessibility": 0.20, "age": 0.15},
    "traffic_enabled": false,
    "confirmations_for_max": 5,
    "days_for_max_age": 30,
    "thresholds": {"sedang": 25, "tinggi": 50, "kritis": 75}
  }'::jsonb
) on conflict (key) do nothing;
