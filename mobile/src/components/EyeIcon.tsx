import { View } from 'react-native';
import { colors } from '../lib/theme';

/** Ikon mata untuk tombol lihat password (digambar dari View, tanpa pustaka tambahan). `off` = mata dicoret (password sedang terlihat). */
export function EyeIcon({ off, size = 28, color = colors.primary }: { off?: boolean; size?: number; color?: string }) {
  const w = size;
  const h = size * 0.62;
  const pupil = size * 0.3;
  return (
    <View style={{ width: w, height: w, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View
        style={{
          width: w,
          height: h,
          borderRadius: h,
          borderWidth: size * 0.09,
          borderColor: color,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View style={{ width: pupil, height: pupil, borderRadius: pupil, backgroundColor: color }} />
      </View>
      {off && (
        <View
          style={{
            position: 'absolute',
            width: w * 1.1,
            height: size * 0.1,
            borderRadius: size,
            backgroundColor: color,
            transform: [{ rotate: '-40deg' }],
            borderWidth: size * 0.04,
            borderColor: '#fff',
          }}
        />
      )}
    </View>
  );
}
