import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../lib/theme';

interface Props {
  children: ReactNode;
  onPress?: () => void;
  color?: string;
  radius?: number;
  offset?: number; // dipertahankan agar pemanggil lama tetap valid; tidak dipakai
  style?: StyleProp<ViewStyle>; // wadah luar (margin, flex)
  innerStyle?: StyleProp<ViewStyle>; // isi (padding)
}

/** Kartu putih dengan garis tipis dan bayangan halus. */
export function Sticker({ children, onPress, color = colors.card, radius = 14, style, innerStyle }: Props) {
  const body = <View style={[styles.body, { backgroundColor: color, borderRadius: radius }, innerStyle]}>{children}</View>;
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { opacity: 0.92 }, style]}>
      {body}
    </Pressable>
  ) : (
    <View style={style}>{body}</View>
  );
}

const styles = StyleSheet.create({
  body: {
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    shadowColor: '#16201D',
    shadowOpacity: 0.07,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
