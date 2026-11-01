import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { colors, fonts } from '../lib/theme';

export type DialogButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type DialogState = { title: string; message?: string; buttons: DialogButton[] };

let present: ((d: DialogState) => void) | null = null;

/** Pengganti Alert.alert dengan tampilan sesuai tema aplikasi. Tanda tangannya sama. */
export function alert(title: string, message?: string, buttons?: DialogButton[]) {
  const state: DialogState = { title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] };
  if (present) present(state);
}

function pickIcon(d: DialogState): { icon: IconName; tint: string } {
  if (d.buttons.some((b) => b.style === 'destructive')) {
    return { icon: /keluar/i.test(d.title) ? 'keluar' : 'hapus', tint: '#FBE4E1' };
  }
  if (/^(gagal|izin|foto belum|judul|laporan tidak|tidak)/i.test(d.title)) return { icon: 'peringatan', tint: '#FBF0CF' };
  if (/(terkirim|diperbarui|berhasil|tersimpan)/i.test(d.title)) return { icon: 'berhasil', tint: '#DCEFE6' };
  return { icon: 'informasi', tint: colors.primarySoft };
}

export function DialogHost({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [visible, setVisible] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const show = useCallback(
    (d: DialogState) => {
      setDialog(d);
      setVisible(true);
      anim.setValue(0);
      Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    },
    [anim],
  );

  useEffect(() => {
    present = show;
    return () => {
      present = null;
    };
  }, [show]);

  const close = (after?: () => void) => {
    Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setVisible(false);
      after?.();
    });
  };

  const buttons = dialog?.buttons ?? [];
  const { icon, tint } = dialog ? pickIcon(dialog) : { icon: 'informasi' as IconName, tint: colors.primarySoft };
  // Dua tombol berdampingan; tiga atau lebih ditumpuk.
  const stacked = buttons.length > 2;

  return (
    <>
      {children}
      <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={() => close()}>
        <Animated.View style={[styles.backdrop, { opacity: anim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} />
          <Animated.View
            style={[
              styles.card,
              { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] },
            ]}
          >
            <View style={styles.sign}>
              <View style={[styles.iconWrap, { backgroundColor: tint }]}>
                <Icon name={icon} size={52} />
              </View>
              <Text style={styles.title}>{dialog?.title}</Text>
              {!!dialog?.message && <Text style={styles.message}>{dialog.message}</Text>}
              <View style={styles.lane} />
              <View style={[styles.actions, stacked && { flexDirection: 'column' }]}>
                {buttons.map((b, i) => {
                  const cancel = b.style === 'cancel';
                  const destructive = b.style === 'destructive';
                  return (
                    <Pressable
                      key={i}
                      onPress={() => close(b.onPress)}
                      style={({ pressed }) => [
                        styles.btn,
                        !stacked && { flex: 1 },
                        cancel ? styles.btnGhost : destructive ? styles.btnDanger : styles.btnPrimary,
                        pressed && { opacity: 0.85 },
                      ]}
                    >
                      <Text style={[styles.btnText, cancel && { color: colors.primary }]}>{b.text}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(6,55,45,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: 5,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  // Bingkai putih tipis seperti papan petunjuk jalan.
  sign: {
    backgroundColor: '#fff',
    borderRadius: 19,
    borderWidth: 2,
    borderColor: colors.primary,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    alignItems: 'center',
  },
  iconWrap: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { fontFamily: fonts.displayBold, fontSize: 24, lineHeight: 27, color: colors.ink, textAlign: 'center' },
  message: { color: colors.text, fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 8 },
  lane: { alignSelf: 'stretch', borderTopWidth: 2, borderStyle: 'dashed', borderColor: colors.line, marginVertical: 16 },
  actions: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  btn: { minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  btnPrimary: { backgroundColor: colors.primary },
  btnDanger: { backgroundColor: colors.danger },
  btnGhost: { backgroundColor: colors.primarySoft },
  btnText: { color: '#fff', fontFamily: fonts.displayBold, fontSize: 17 },
});
