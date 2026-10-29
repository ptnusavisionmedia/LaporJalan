import {
  ACCESSIBILITY_IMPACTS, DAMAGE_CATEGORIES, INDONESIA_BOUNDS, PHOTO_LIMITS, SEVERITIES, createReportSchema, labelOf,
} from '@laporjalan/shared';
import { useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { Button, Card, Chip, TextField } from '@/components/ui';
import { AI_LABEL, analyzePhoto, type AiResult } from '@/services/ai';
import { pickFromGallery, takePhoto, type PickedPhoto } from '@/services/photos';
import { RegionPicker, EMPTY_REGION, type RegionValue } from '@/components/RegionPicker';
import { submitReport, uuid } from '@/services/reports';

type Step = 'category' | 'photos' | 'details' | 'location' | 'review' | 'success';
const STEPS: Step[] = ['category', 'photos', 'details', 'location', 'review'];
const TITLES: Record<Step, string> = {
  category: '1. Pilih kategori', photos: '2. Foto kerusakan', details: '3. Detail laporan',
  location: '4. Lokasi kerusakan', review: '5. Tinjau & kirim', success: 'Laporan terkirim',
};

export default function ReportScreen() {
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>('category');
  const [category, setCategory] = useState<string | null>(null);
  const [photos, setPhotos] = useState<PickedPhoto[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [roadName, setRoadName] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [access, setAccess] = useState<'none' | 'low' | 'medium' | 'high'>('none');
  const [latText, setLatText] = useState('');
  const [lngText, setLngText] = useState('');
  const [region, setRegion] = useState<RegionValue>(EMPTY_REGION);
  const [regionMissing, setRegionMissing] = useState<string | null>('Provinsi');
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ai, setAi] = useState<AiResult | null>(null);
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'unavailable'>('idle');
  const [error, setError] = useState<string | null>(null);
  // One key per form so a retried submit cannot create a duplicate report.
  const idemKey = useRef(uuid());

  const reset = () => {
    setStep('category'); setCategory(null); setPhotos([]); setTitle(''); setDescription(''); setRoadName('');
    setSeverity('medium'); setAccess('none'); setLatText(''); setLngText(''); setRegion(EMPTY_REGION); setError(null); setAi(null); setAiState('idle');
    idemKey.current = uuid();
  };

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'); }
  };

  const addPhotos = (source: 'camera' | 'gallery') =>
    run(async () => {
      const room = PHOTO_LIMITS.maxCount - photos.length;
      if (room <= 0) throw new Error('Maksimal 5 foto.');
      const added = source === 'camera' ? [await takePhoto()].filter((p): p is PickedPhoto => !!p) : await pickFromGallery(room);
      setPhotos((cur) => [...cur, ...added].slice(0, PHOTO_LIMITS.maxCount));
    });

  const runAi = async () => {
    setAiState('loading');
    setAi(null);
    try {
      const res = await analyzePhoto(photos[0]);
      setAi(res);
      setAiState(res ? 'idle' : 'unavailable');
    } catch {
      setAiState('unavailable');
    }
  };

  const detectLocation = async () => {
    setLocating(true);
    await run(async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) throw new Error('Izin lokasi ditolak. Masukkan koordinat secara manual.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatText(pos.coords.latitude.toFixed(6));
      setLngText(pos.coords.longitude.toFixed(6));
    });
    setLocating(false);
  };

  const lat = Number(latText.replace(',', '.'));
  const lng = Number(lngText.replace(',', '.'));
  const draft = {
    title, description, category: category ?? '', severity, accessibilityImpact: access, lat, lng,
    roadName: roadName || undefined,
    photos: photos.map((p, i) => ({ storage_path: `pending/${i}`, mime_type: p.mime_type, size_bytes: p.size_bytes, width: p.width, height: p.height })),
  };
  const parsed = createReportSchema.safeParse(draft);
  const fieldError = (key: string) => (parsed.success ? undefined : parsed.error.issues.find((i) => i.path[0] === key)?.message);

  const next = () => {
    setError(null);
    if (step === 'category' && !category) return setError('Pilih kategori kerusakan.');
    if (step === 'photos' && photos.length === 0) return setError('Tambahkan minimal 1 foto.');
    if (step === 'details') {
      const m = fieldError('title') ?? fieldError('description');
      if (m) return setError(m);
    }
    if (step === 'location') {
      if (!latText || !lngText || Number.isNaN(lat) || Number.isNaN(lng)) return setError('Tentukan lokasi kerusakan.');
      const m = fieldError('lat') ?? fieldError('lng');
      if (m) return setError(m);
      if (regionMissing) return setError(`Pilih ${regionMissing.toLowerCase()} lokasi kerusakan.`);
    }
    setStep(STEPS[STEPS.indexOf(step) + 1]);
  };

  const submit = async () => {
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    await run(async () => {
      const { photos: _p, ...input } = parsed.data;
      await submitReport(input, photos, region, idemKey.current);
      qc.invalidateQueries({ queryKey: ['my-reports'] });
      qc.invalidateQueries({ queryKey: ['my-stats'] });
      setStep('success');
    });
    setBusy(false);
  };

  if (step === 'success') {
    return (
      <View className="flex-1 justify-center gap-4 bg-background p-6 dark:bg-navy">
        <Text accessibilityRole="header" className="text-2xl font-bold text-success">Laporan Berhasil Dikirim</Text>
        <Text className="text-navy dark:text-slate-200">Laporan kerusakan Anda berhasil dikirim dan sedang menunggu verifikasi.</Text>
        <Button title="Lihat laporan saya" onPress={() => { reset(); router.navigate('/(tabs)/activity'); }} />
        <Button title="Buat laporan lain" variant="secondary" onPress={reset} />
      </View>
    );
  }

  const idx = STEPS.indexOf(step);
  return (
    <ScrollView className="flex-1 bg-background dark:bg-navy" contentContainerClassName="p-5 pt-14" keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" className="mb-1 text-2xl font-bold text-navy dark:text-white">{TITLES[step]}</Text>
      <Text className="mb-4 text-muted">Langkah {idx + 1} dari {STEPS.length}</Text>

      {step === 'category' && (
        <View className="gap-2" accessibilityRole="radiogroup">
          {DAMAGE_CATEGORIES.map((c) => (
            <Chip key={c.value} label={c.label} selected={category === c.value} onPress={() => { setCategory(c.value); if (c.accessibility) setAccess('high'); }} />
          ))}
        </View>
      )}

      {step === 'photos' && (
        <View className="gap-3">
          <Text className="text-muted">Foto dikompres otomatis dan metadata (termasuk lokasi EXIF) dihapus sebelum diunggah. Maksimal 5 foto.</Text>
          <View className="flex-row flex-wrap gap-2">
            {photos.map((p, i) => (
              <View key={p.uri}>
                <Image source={{ uri: p.uri }} accessibilityLabel={`Foto ${i + 1}`} className="h-24 w-24 rounded-xl" />
                <Text accessibilityRole="button" accessibilityLabel={`Hapus foto ${i + 1}`} onPress={() => setPhotos((c) => c.filter((_, j) => j !== i))} className="min-h-8 pt-1 text-center text-danger">Hapus</Text>
              </View>
            ))}
          </View>
          <Button title="Ambil foto" onPress={() => addPhotos('camera')} />
          <Button title="Pilih dari galeri" variant="secondary" onPress={() => addPhotos('gallery')} />
          {photos.length > 0 ? (
            <Card>
              <Text className="mb-2 text-navy dark:text-slate-200">Analisis AI (opsional) memberi saran dari foto pertama. Hasilnya hanya perkiraan dan tidak mengubah laporan Anda.</Text>
              <Button title="Analisis foto dengan AI" variant="secondary" loading={aiState === 'loading'} onPress={runAi} />
              {aiState === 'unavailable' ? <Text className="mt-2 text-muted">Analisis AI sedang tidak tersedia. Anda tetap dapat melanjutkan laporan.</Text> : null}
              {ai ? (
                <View className="mt-3">
                  <Text className="font-semibold text-navy dark:text-white">{AI_LABEL[ai.category] ?? ai.category} ({Math.round(ai.confidence * 100)}% keyakinan)</Text>
                  {ai.severity_estimate ? <Text className="text-muted">Perkiraan keparahan: {labelOf(SEVERITIES, ai.severity_estimate)} (estimasi)</Text> : null}
                  {ai.severity_estimate ? <Button title="Gunakan perkiraan keparahan ini" variant="secondary" onPress={() => setSeverity(ai.severity_estimate!)} /> : null}
                </View>
              ) : null}
            </Card>
          ) : null}
        </View>
      )}

      {step === 'details' && (
        <View>
          <TextField label="Judul laporan" value={title} onChangeText={setTitle} maxLength={120} />
          <TextField label="Deskripsi kerusakan" value={description} onChangeText={setDescription} multiline numberOfLines={4} maxLength={2000} style={{ minHeight: 100, textAlignVertical: 'top' }} />
          <TextField label="Nama jalan (opsional)" value={roadName} onChangeText={setRoadName} maxLength={150} />
          <Text className="mb-2 font-medium text-navy dark:text-slate-200">Perkiraan tingkat keparahan (estimasi Anda)</Text>
          <View className="mb-4 flex-row flex-wrap gap-2">
            {SEVERITIES.map((s) => <Chip key={s.value} label={s.label} selected={severity === s.value} onPress={() => setSeverity(s.value)} />)}
          </View>
          <Text className="mb-2 font-medium text-navy dark:text-slate-200">Dampak terhadap aksesibilitas</Text>
          <View className="flex-row flex-wrap gap-2">
            {ACCESSIBILITY_IMPACTS.map((s) => <Chip key={s.value} label={s.label} selected={access === s.value} onPress={() => setAccess(s.value)} />)}
          </View>
        </View>
      )}

      {step === 'location' && (
        <View>
          <Card>
            <Text className="text-navy dark:text-slate-200">
              Lokasi dipakai untuk menandai titik kerusakan. Izin lokasi hanya diminta saat Anda menekan tombol di bawah, dan hanya posisi kerusakan yang disimpan. Jika Anda tidak berada di lokasi kerusakan, isi koordinat secara manual.
            </Text>
          </Card>
          <Button title="Gunakan lokasi saya sekarang" loading={locating} onPress={detectLocation} />
          <View className="mt-4">
            <TextField label="Lintang (latitude)" keyboardType="numbers-and-punctuation" value={latText} onChangeText={setLatText} placeholder={`${INDONESIA_BOUNDS.minLat} s.d. ${INDONESIA_BOUNDS.maxLat}`} />
            <TextField label="Bujur (longitude)" keyboardType="numbers-and-punctuation" value={lngText} onChangeText={setLngText} placeholder={`${INDONESIA_BOUNDS.minLng} s.d. ${INDONESIA_BOUNDS.maxLng}`} />
          </View>
          <RegionPicker value={region} onChange={setRegion} onMissing={setRegionMissing} />
        </View>
      )}

      {step === 'review' && (
        <View>
          <Card>
            <Text className="font-semibold text-navy dark:text-white">{title}</Text>
            <Text className="text-muted">{labelOf(DAMAGE_CATEGORIES, category)}</Text>
            <Text className="mt-2 text-navy dark:text-slate-200">{description}</Text>
            <Text className="mt-2 text-muted">Keparahan (estimasi): {labelOf(SEVERITIES, severity)}</Text>
            <Text className="text-muted">Aksesibilitas: {labelOf(ACCESSIBILITY_IMPACTS, access)}</Text>
            <Text className="text-muted">Koordinat: {lat.toFixed(5)}, {lng.toFixed(5)}</Text>
            <Text className="text-muted">Foto: {photos.length}</Text>
          </Card>
        </View>
      )}

      {error ? <Text accessibilityRole="alert" className="my-3 text-danger">{error}</Text> : null}

      <View className="mt-6 gap-3">
        {step === 'review' ? (
          <Button title="Kirim laporan" onPress={() => Alert.alert('Kirim laporan?', 'Pastikan data sudah benar.', [{ text: 'Batal' }, { text: 'Kirim', onPress: submit }])} loading={busy} />
        ) : (
          <Button title="Lanjut" onPress={next} />
        )}
        {idx > 0 ? <Button title="Kembali" variant="secondary" onPress={() => setStep(STEPS[idx - 1])} /> : null}
      </View>
    </ScrollView>
  );
}
