import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Toast } from '../game/useGame';
import { colors, fonts } from '../theme';

const useNative = Platform.OS !== 'web';
const SHOW_MS = 3500;

/** Pop-up notifications at the top of the screen (achievements, deal results). Tap to dismiss. */
export function Toasts({ toasts, onDismiss, top }: { toasts: Toast[]; onDismiss: (id: number) => void; top: number }) {
  return (
    <View pointerEvents="box-none" style={[styles.stack, { top }]}>
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </View>
  );
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [anim] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, friction: 6, tension: 120, useNativeDriver: useNative }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: useNative }).start(() =>
        onDismiss(toast.id),
      );
    }, SHOW_MS);
    return () => clearTimeout(t);
  }, [anim, onDismiss, toast.id]);

  const border = toast.tone === 'good' ? colors.green : toast.tone === 'bad' ? colors.danger : colors.gold;
  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
      }}
    >
      <Pressable onPress={() => onDismiss(toast.id)} style={[styles.card, { borderColor: border }]}>
        <Text style={styles.emoji}>{toast.emoji}</Text>
        <View style={styles.textCol}>
          <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
          <Text style={styles.body} numberOfLines={1}>{toast.body}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: { position: 'absolute', left: 16, right: 16, alignItems: 'center', gap: 8, zIndex: 50 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0D2C21F2',
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  emoji: { fontSize: 26 },
  textCol: { flex: 1, minWidth: 0 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 16 },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
});
