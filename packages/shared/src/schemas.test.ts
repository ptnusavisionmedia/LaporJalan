import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReportSchema, registerSchema } from './schemas.ts';

const photo = { storage_path: 'u/p.jpg', mime_type: 'image/jpeg', size_bytes: 1000 } as const;
const valid = {
  title: 'Lubang besar di jalan',
  description: 'Lubang sedalam 20 cm di tengah jalan',
  category: 'jalan_berlubang',
  severity: 'high',
  accessibilityImpact: 'none',
  lat: -6.2,
  lng: 106.8,
  photos: [photo],
};

test('laporan valid diterima', () => {
  assert.equal(createReportSchema.safeParse(valid).success, true);
});

test('lokasi di luar Indonesia ditolak', () => {
  assert.equal(createReportSchema.safeParse({ ...valid, lat: 40, lng: -74 }).success, false);
});

test('laporan tanpa foto ditolak', () => {
  assert.equal(createReportSchema.safeParse({ ...valid, photos: [] }).success, false);
});

test('foto lebih dari 5 MB ditolak', () => {
  const big = { ...photo, size_bytes: 6 * 1024 * 1024 };
  assert.equal(createReportSchema.safeParse({ ...valid, photos: [big] }).success, false);
});

test('registrasi: sandi tidak cocok ditolak', () => {
  const r = registerSchema.safeParse({
    fullName: 'Budi', email: 'budi@example.com', password: 'abcd1234',
    confirmPassword: 'abcd9999', acceptTerms: true,
  });
  assert.equal(r.success, false);
});

test('registrasi: wajib setuju syarat', () => {
  const r = registerSchema.safeParse({
    fullName: 'Budi', email: 'budi@example.com', password: 'abcd1234',
    confirmPassword: 'abcd1234', acceptTerms: false,
  });
  assert.equal(r.success, false);
});
