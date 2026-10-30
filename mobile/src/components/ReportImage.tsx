import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../lib/theme';

export function ReportImage({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  return (
    <View style={style}>
      {failedUri === uri ? (
        <View style={styles.fallback}>
          <Text style={styles.text}>Foto tidak dapat dimuat.</Text>
          <Text style={styles.text}>Jika file rusak, pelapor dapat mengganti foto di detail laporan.</Text>
          <Pressable onPress={() => { setFailedUri(null); setRetry(retry + 1); }} accessibilityRole="button">
            <Text style={styles.retry}>Coba lagi</Text>
          </Pressable>
        </View>
      ) : (
        <Image key={`${uri}-${retry}`} source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setFailedUri(uri)} accessibilityLabel="Foto kerusakan jalan" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, gap: 8 },
  text: { color: colors.muted, textAlign: 'center' },
  retry: { color: colors.primaryDark, fontWeight: '700', padding: 8 },
});
