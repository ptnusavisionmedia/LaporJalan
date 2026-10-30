import { Image, type ImageStyle, type StyleProp } from 'react-native';

// Ikon resmi LaporJalan (design/icons/fitur, varian satu warna). Warna diatur lewat `color`.
const sources = {
  beranda: require('../../assets/icons/beranda.png'),
  peta: require('../../assets/icons/peta.png'),
  'buat-laporan': require('../../assets/icons/buat-laporan.png'),
  statistik: require('../../assets/icons/statistik.png'),
  profil: require('../../assets/icons/profil.png'),
  password: require('../../assets/icons/password.png'),
  keluar: require('../../assets/icons/keluar.png'),
  lokasi: require('../../assets/icons/lokasi.png'),
  'lokasi-saya': require('../../assets/icons/lokasi-saya.png'),
  kamera: require('../../assets/icons/kamera.png'),
  galeri: require('../../assets/icons/galeri.png'),
  'ganti-foto': require('../../assets/icons/ganti-foto.png'),
  hapus: require('../../assets/icons/hapus.png'),
  tambah: require('../../assets/icons/tambah.png'),
  tutup: require('../../assets/icons/tutup.png'),
  suka: require('../../assets/icons/suka.png'),
  'sudah-disukai': require('../../assets/icons/sudah-disukai.png'),
  komentar: require('../../assets/icons/komentar.png'),
  peringatan: require('../../assets/icons/peringatan.png'),
  berhasil: require('../../assets/icons/berhasil.png'),
  'sekitar-saya': require('../../assets/icons/sekitar-saya.png'),
  informasi: require('../../assets/icons/informasi.png'),
  'area-berbahaya': require('../../assets/icons/area-berbahaya.png'),
  'jalan-berlubang': require('../../assets/icons/jalan-berlubang.png'),
  'jalan-retak': require('../../assets/icons/jalan-retak.png'),
  'trotoar-rusak': require('../../assets/icons/trotoar-rusak.png'),
  'trotoar-terhalang': require('../../assets/icons/trotoar-terhalang.png'),
  'jalur-pemandu': require('../../assets/icons/jalur-pemandu.png'),
  'akses-kursi-roda': require('../../assets/icons/akses-kursi-roda.png'),
} as const;

export type IconName = keyof typeof sources;

export function Icon({
  name,
  size = 20,
  color,
  style,
}: {
  name: IconName;
  size?: number;
  color?: string;
  style?: StyleProp<ImageStyle>;
}) {
  return (
    <Image
      source={sources[name]}
      style={[{ width: size, height: size, tintColor: color }, style]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

/** Logo utama aplikasi (assets/logo.png). */
export function Logo({ size = 56, radius }: { size?: number; radius?: number }) {
  return (
    <Image
      source={require('../../assets/logo.png')}
      style={{ width: size, height: size, borderRadius: radius ?? size * 0.22 }}
      accessibilityLabel="LaporJalan"
    />
  );
}
