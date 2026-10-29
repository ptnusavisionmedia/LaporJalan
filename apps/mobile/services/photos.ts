import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { PHOTO_LIMITS } from '@laporjalan/shared';

export type PickedPhoto = { uri: string; mime_type: 'image/jpeg'; size_bytes: number; width: number; height: number };

const ALLOWED = new Set<string>(PHOTO_LIMITS.mimeTypes);

// Re-encoding through the manipulator drops EXIF metadata (including embedded GPS) and
// shrinks the file. Output is always JPEG, so the stored type is known and safe.
async function normalize(asset: ImagePicker.ImagePickerAsset): Promise<PickedPhoto> {
  if (asset.mimeType && !ALLOWED.has(asset.mimeType)) {
    throw new Error('Format foto tidak didukung. Gunakan JPEG, PNG, atau WebP.');
  }
  const maxSide = 1600;
  const resize = asset.width >= asset.height ? { width: Math.min(asset.width, maxSide) } : { height: Math.min(asset.height, maxSide) };
  const ctx = ImageManipulator.ImageManipulator.manipulate(asset.uri);
  ctx.resize(resize);
  const rendered = await ctx.renderAsync();
  const out = await rendered.saveAsync({ compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });

  const blob = await (await fetch(out.uri)).blob();
  if (blob.size > PHOTO_LIMITS.maxBytes) throw new Error('Ukuran foto melebihi 5 MB setelah dikompres.');
  return { uri: out.uri, mime_type: 'image/jpeg', size_bytes: blob.size, width: out.width, height: out.height };
}

export async function takePhoto(): Promise<PickedPhoto | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) throw new Error('Izin kamera ditolak. Aktifkan di pengaturan, atau pilih foto dari galeri.');
  const res = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 });
  return res.canceled ? null : normalize(res.assets[0]);
}

export async function pickFromGallery(limit: number): Promise<PickedPhoto[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: limit,
    quality: 1,
  });
  if (res.canceled) return [];
  return Promise.all(res.assets.map(normalize));
}
