import type { ExpoConfig } from 'expo/config';

// The Android package id can be overridden per environment. The EAS project ID
// is public build metadata (not a credential); signing keys stay managed by EAS.
const androidPackage = process.env.ANDROID_PACKAGE ?? 'com.nusaaplikasisteam.laporjalan';
const easProjectId =
  process.env.EAS_PROJECT_ID ??
  process.env.EAS_BUILD_PROJECT_ID ??
  'f424bc80-b108-47ce-a726-215b4658ed33';

const config: ExpoConfig = {
  owner: 'nusaaplikasis-team',
  name: 'LaporJalan',
  slug: 'laporjalan',
  version: '0.1.0',
  scheme: 'laporjalan',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  android: {
    package: androidPackage,
    adaptiveIcon: {
      backgroundColor: '#2563EB',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    // Foreground only. Background location is intentionally NOT requested (see docs/EXPO_GO.md).
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'CAMERA', 'POST_NOTIFICATIONS'],
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    'expo-splash-screen',
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'LaporJalan memakai lokasi Anda untuk menandai titik kerusakan dan menampilkan laporan di sekitar Anda.',
      },
    ],
    [
      'expo-image-picker',
      {
        cameraPermission: 'LaporJalan memakai kamera untuk memotret kerusakan infrastruktur.',
        photosPermission: 'LaporJalan memakai galeri agar Anda dapat melampirkan foto kerusakan.',
      },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: {
    eas: { projectId: easProjectId },
  },
};

export default config;
