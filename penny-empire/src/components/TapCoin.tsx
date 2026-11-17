import { useCallback, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { formatMoney } from '../game/format';
import { colors } from '../theme';

interface Float {
  id: number;
  x: number;
  label: string;
  progress: Animated.Value;
}

const MAX_FLOATS = 12;
const useNative = Platform.OS !== 'web';
// react-native-web waits 50ms before firing onPressIn and drops it for quicker taps; fire immediately instead.
const webNoPressDelay = (Platform.OS === 'web' ? { delayPressIn: 0 } : {}) as object;

export function TapCoin({ perTap, onTap }: { perTap: number; onTap: () => void }) {
  const [scale] = useState(() => new Animated.Value(1));
  const [floats, setFloats] = useState<Float[]>([]);
  const nextId = useRef(0);

  const handlePress = useCallback(() => {
    onTap();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }

    scale.setValue(0.9);
    Animated.spring(scale, { toValue: 1, friction: 3, tension: 200, useNativeDriver: useNative }).start();

    const float: Float = {
      id: nextId.current++,
      x: (Math.random() - 0.5) * 140,
      label: '+' + formatMoney(perTap),
      progress: new Animated.Value(0),
    };
    setFloats((f) => [...f.slice(-(MAX_FLOATS - 1)), float]);
    Animated.timing(float.progress, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.quad),
      useNativeDriver: useNative,
    }).start(() => setFloats((f) => f.filter((x) => x.id !== float.id)));
  }, [onTap, perTap, scale]);

  return (
    <View style={styles.wrap}>
      <Pressable {...webNoPressDelay} onPressIn={handlePress} accessibilityRole="button" accessibilityLabel={`Tap to earn ${formatMoney(perTap)}`}>
        <Animated.View style={[styles.coin, { transform: [{ scale }] }]}>
          <View style={styles.inner}>
            <Text style={styles.symbol}>$</Text>
          </View>
        </Animated.View>
      </Pressable>
      {floats.map((f) => (
        <Animated.Text
          key={f.id}
          pointerEvents="none"
          style={[
            styles.float,
            {
              opacity: f.progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: f.x },
                { translateY: f.progress.interpolate({ inputRange: [0, 1], outputRange: [-40, -150] }) },
              ],
            },
          ]}
        >
          {f.label}
        </Animated.Text>
      ))}
    </View>
  );
}

const SIZE = 170;

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', height: SIZE + 40 },
  coin: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.gold,
    borderWidth: 6,
    borderColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.gold,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  inner: {
    width: SIZE - 40,
    height: SIZE - 40,
    borderRadius: (SIZE - 40) / 2,
    borderWidth: 3,
    borderColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontSize: 72, fontWeight: '900', color: colors.goldDark },
  float: {
    position: 'absolute',
    top: '50%',
    fontSize: 22,
    fontWeight: '800',
    color: colors.green,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
});
