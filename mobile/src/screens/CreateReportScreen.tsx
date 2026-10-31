import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Icon, type IconName } from '../components/Icon';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../lib/auth';
import { analyzeImage, createReport } from '../lib/api';
import { categoryMeta, CATEGORIES, colors, severityMeta, TRAFFICS, fonts } from '../lib/theme';
import type { AiResult, Category, Traffic } from '../lib/types';

function Chip({ label, active, onPress, icon }: { label: string; active: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      {!!icon && <Icon name={icon} size={25} />}
      <Text style={[styles.chipText, active && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

export function CreateReportScreen() {
  const { session } = useAuth();
  const nav = useNavigation<any>();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [region, setRegion] = useState({ province: '', city: '', district: '', village: '' });
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [category, setCategory] = useState<Category>('jalan_berlubang');
  const [severity, setSeverity] = useState<1 | 2 | 3>(2);
  const [traffic, setTraffic] = useState<Traffic>('sedang');
  const [ai, setAi] = useState<AiResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);

  const fillLocation = async () => {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') return Alert.alert('Izin lokasi ditolak', 'Isi alamat secara manual.');
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      const [place] = await Location.reverseGeocodeAsync(pos.coords);
      if (place) {
        const parts = [place.street, place.district, place.city ?? place.subregion, place.region].filter(Boolean);
        if (parts.length) setAddress(parts.join(', '));
        // Pemetaan geocoder ke wilayah admin Indonesia (bisa dikoreksi manual di form).
        setRegion({
          province: place.region ?? '',
          city: place.subregion ?? place.city ?? '',
          district: place.city ?? '',
          village: place.district ?? '',
        });
      }
    } catch {
      Alert.alert('Gagal mengambil lokasi', 'Isi alamat secara manual.');
    } finally {
      setLocating(false);
    }
  };

  const runAi = async (base64: string) => {
    setAnalyzing(true);
    setAi(null);
    const result = await analyzeImage(base64);
    setAnalyzing(false);
    if (!result) return;
    setAi(result);
    if (result.category !== 'bukan_kerusakan' && result.confidence >= 0.5) {
      setCategory(result.category);
      setSeverity(result.severity);
    }
  };

  const pick = async (source: 'camera' | 'gallery') => {
    const perm =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('Izin diperlukan', 'Berikan izin di pengaturan perangkat.');
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true };
    const res =
      source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (!res.canceled) {
      const b64 = res.assets[0].base64 ?? null;
      setImageUri(res.assets[0].uri);
      setImageBase64(b64);
      if (!coords) fillLocation();
      if (b64) runAi(b64);
    }
  };

  const reset = () => {
    setImageUri(null);
    setImageBase64(null);
    setTitle('');
    setDescription('');
    setAddress('');
    setRegion({ province: '', city: '', district: '', village: '' });
    setCoords(null);
    setAi(null);
    setCategory('jalan_berlubang');
    setSeverity(2);
    setTraffic('sedang');
  };

  const submit = async () => {
    if (!imageUri || !imageBase64) return Alert.alert('Foto belum ada', 'Ambil foto kerusakan terlebih dahulu.');
    if (title.trim().length < 3) return Alert.alert('Judul terlalu pendek', 'Isi judul minimal 3 karakter.');
    setBusy(true);
    try {
      await createReport({
        userId: session!.user.id,
        title: title.trim(),
        description: description.trim(),
        address: address.trim(),
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        imageUri,
        imageBase64,
        category,
        severity,
        traffic,
        province: region.province.trim(),
        city: region.city.trim(),
        district: region.district.trim(),
        village: region.village.trim(),
        ai,
      });
      reset();
      Alert.alert('Terkirim', 'Laporanmu sudah masuk dan menunggu diverifikasi admin.');
      nav.navigate('Beranda');
    } catch (e) {
      Alert.alert('Gagal mengirim', e instanceof Error ? e.message : 'Coba lagi.');
    } finally {
      setBusy(false);
    }
  };

  const regionField = (key: keyof typeof region, label: string) => (
    <View style={{ flex: 1, minWidth: '45%' }}>
      <Text style={styles.small}>{label}</Text>
      <TextInput
        style={[styles.input, { paddingVertical: 8 }]}
        value={region[key]}
        onChangeText={(v) => setRegion((r) => ({ ...r, [key]: v }))}
        placeholderTextColor={colors.muted}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior="padding">
      <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <View style={[styles.preview, styles.placeholder]}>
            <Icon name="kamera" size={74} />
            <Text style={{ color: colors.ink, marginTop: 6, fontWeight: '700', fontSize: 16 }}>Mulai dari foto kerusakan</Text>
            <Text style={{ color: colors.muted, fontSize: 12 }}>Jalan, trotoar, atau akses disabilitas</Text>
          </View>
        )}

        <View style={styles.row}>
          <Pressable style={[styles.pickBtn, { flex: 1 }]} onPress={() => pick('camera')}>
            <Icon name="kamera" size={31} />
            <Text style={styles.pickText}>Kamera</Text>
          </Pressable>
          <Pressable style={[styles.pickBtn, { flex: 1 }]} onPress={() => pick('gallery')}>
            <Icon name="galeri" size={31} />
            <Text style={styles.pickText}>Galeri</Text>
          </Pressable>
        </View>

        {analyzing && (
          <View style={styles.aiBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.text }}>AI sedang menganalisis foto...</Text>
          </View>
        )}
        {ai && (
          <View style={styles.aiBox}>
            <Icon name="informasi" size={31} />
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>
                Saran AI:{' '}
                {ai.category === 'bukan_kerusakan'
                  ? 'foto tidak terlihat seperti kerusakan jalan'
                  : `${categoryMeta[ai.category].label}, ${severityMeta[ai.severity].label.toLowerCase()}`}
                {` (${Math.round(ai.confidence * 100)}%)`}
              </Text>
              {!!ai.summary && <Text style={{ color: colors.muted, fontSize: 12 }}>{ai.summary}</Text>}
              <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                Hanya saran, kamu tetap bisa mengubah pilihan di bawah.
              </Text>
            </View>
          </View>
        )}

        <Text style={styles.label}>Jenis masalah</Text>
        <View style={styles.wrapRow}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={categoryMeta[c].label}
              icon={categoryMeta[c].icon}
              active={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </View>
        {categoryMeta[category].access && (
          <Text style={styles.hint}>♿ Laporan aksesibilitas diprioritaskan untuk penyandang disabilitas.</Text>
        )}

        <Text style={styles.label}>Tingkat bahaya</Text>
        <View style={styles.wrapRow}>
          {([1, 2, 3] as const).map((s) => (
            <Chip key={s} label={severityMeta[s].label} active={severity === s} onPress={() => setSeverity(s)} />
          ))}
        </View>

        <Text style={styles.label}>Kepadatan lalu lintas di lokasi</Text>
        <View style={styles.wrapRow}>
          {TRAFFICS.map((t) => (
            <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} active={traffic === t} onPress={() => setTraffic(t)} />
          ))}
        </View>

        <Text style={styles.label}>Judul laporan</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="contoh: Lubang besar di Jl. Merdeka"
          placeholderTextColor={colors.muted}
          maxLength={120}
        />

        <Text style={styles.label}>Deskripsi</Text>
        <TextInput
          style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Ceritakan kondisi kerusakan..."
          placeholderTextColor={colors.muted}
          multiline
        />

        <Text style={styles.label}>Lokasi</Text>
        <TextInput
          style={styles.input}
          value={address}
          onChangeText={setAddress}
          placeholder="Alamat / patokan lokasi"
          placeholderTextColor={colors.muted}
        />
        <Pressable style={styles.locBtn} onPress={fillLocation} disabled={locating}>
          {locating ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Icon name="lokasi-saya" size={28} />
          )}
          <Text style={styles.pickText}>{coords ? 'Perbarui lokasi saat ini' : 'Gunakan lokasi saat ini'}</Text>
        </Pressable>

        <Text style={styles.label}>Wilayah (terisi otomatis, boleh dikoreksi)</Text>
        <View style={styles.wrapRow}>
          {regionField('province', 'Provinsi')}
          {regionField('city', 'Kabupaten/Kota')}
          {regionField('district', 'Kecamatan')}
          {regionField('village', 'Desa/Kelurahan')}
        </View>

        <Pressable style={[styles.submit, busy && { opacity: 0.6 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Kirim Laporan</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 32, backgroundColor: colors.bg, flexGrow: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  preview: { width: '100%', aspectRatio: 4 / 3, borderRadius: 18, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderStyle: 'dashed', overflow: 'hidden' },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#E2EFEA',
    borderWidth: 1,
    borderColor: colors.line,
  },
  pickText: { color: colors.ink, fontFamily: fonts.displayBold },
  label: { fontFamily: fonts.displayBold, color: colors.ink, marginTop: 20, marginBottom: 8, fontSize: 16 },
  small: { fontSize: 12, color: colors.muted, marginBottom: 2, fontWeight: '600' },
  hint: { color: '#0B5CAD', fontSize: 12, marginTop: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  aiBox: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    backgroundColor: '#E8EEF8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
    marginTop: 14,
  },
  aiTitle: { fontWeight: '700', color: colors.ink },
  locBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  submit: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 20,
  },
  submitText: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 17 },
});
