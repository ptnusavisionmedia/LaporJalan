import { supabase } from './supabase';
import type { PickedPhoto } from './photos';

export type AiResult = {
  category: 'pothole' | 'road_crack' | 'surface_damage' | 'sidewalk_damage' | 'none';
  confidence: number;
  severity_estimate: 'low' | 'medium' | 'high' | 'critical' | null;
  model_version: string;
};

export const AI_LABEL: Record<AiResult['category'], string> = {
  pothole: 'Lubang jalan', road_crack: 'Retak jalan', surface_damage: 'Kerusakan permukaan',
  sidewalk_damage: 'Kerusakan trotoar', none: 'Tidak ada kerusakan dikenali',
};

/**
 * Optional AI suggestion. Returns null whenever the service is unreachable, rate limited or has
 * no model; the caller keeps working without it. Results are shown as a suggestion only.
 */
export async function analyzePhoto(photo: PickedPhoto): Promise<AiResult | null> {
  const form = new FormData();
  // React Native FormData accepts a { uri, name, type } descriptor
  form.append('file', { uri: photo.uri, name: 'photo.jpg', type: photo.mime_type } as unknown as Blob);
  const { data, error } = await supabase.functions.invoke('analyze', { body: form });
  if (error || !data || typeof data.category !== 'string') return null;
  return data as AiResult;
}
