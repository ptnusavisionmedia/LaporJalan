import { z } from 'zod';
import { DAMAGE_CATEGORIES, INDONESIA_BOUNDS, PHOTO_LIMITS } from './constants.ts';

const categoryValues = DAMAGE_CATEGORIES.map((c) => c.value) as [string, ...string[]];

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email wajib diisi')
  .email('Format email tidak valid');

export const passwordSchema = z
  .string()
  .min(8, 'Kata sandi minimal 8 karakter')
  .regex(/[A-Za-z]/, 'Kata sandi harus mengandung huruf')
  .regex(/[0-9]/, 'Kata sandi harus mengandung angka');

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100, 'Nama maksimal 100 karakter'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, { error: 'Anda harus menyetujui Syarat Layanan dan Kebijakan Privasi' }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi kata sandi tidak cocok',
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(2, 'Nama minimal 2 karakter').max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,15}$/, 'Nomor telepon tidak valid')
    .or(z.literal(''))
    .optional(),
});

export const photoSchema = z.object({
  storage_path: z.string(),
  mime_type: z.enum(PHOTO_LIMITS.mimeTypes),
  size_bytes: z.number().int().positive().max(PHOTO_LIMITS.maxBytes, 'Ukuran foto maksimal 5 MB'),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export const createReportSchema = z.object({
  title: z.string().trim().min(5, 'Judul minimal 5 karakter').max(120, 'Judul maksimal 120 karakter'),
  description: z
    .string()
    .trim()
    .min(10, 'Deskripsi minimal 10 karakter')
    .max(2000, 'Deskripsi maksimal 2000 karakter'),
  category: z.enum(categoryValues, { error: 'Pilih kategori kerusakan' }),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  accessibilityImpact: z.enum(['none', 'low', 'medium', 'high']),
  lat: z
    .number()
    .min(INDONESIA_BOUNDS.minLat, 'Lokasi berada di luar wilayah Indonesia')
    .max(INDONESIA_BOUNDS.maxLat, 'Lokasi berada di luar wilayah Indonesia'),
  lng: z
    .number()
    .min(INDONESIA_BOUNDS.minLng, 'Lokasi berada di luar wilayah Indonesia')
    .max(INDONESIA_BOUNDS.maxLng, 'Lokasi berada di luar wilayah Indonesia'),
  roadName: z.string().trim().max(150).optional(),
  photos: z.array(photoSchema).min(1, 'Tambahkan minimal 1 foto').max(PHOTO_LIMITS.maxCount, 'Maksimal 5 foto'),
});
export type CreateReportInput = z.infer<typeof createReportSchema>;

export const statusChangeSchema = z.object({
  reportId: z.string().uuid(),
  to: z.enum(['menunggu_verifikasi', 'terverifikasi', 'dalam_penanganan', 'selesai', 'ditolak']),
  note: z.string().trim().max(1000).optional(),
});

export const priorityOverrideSchema = z.object({
  reportId: z.string().uuid(),
  level: z.enum(['rendah', 'sedang', 'tinggi', 'kritis']),
  score: z.number().min(0).max(100),
  reason: z.string().trim().min(10, 'Alasan minimal 10 karakter'),
});
