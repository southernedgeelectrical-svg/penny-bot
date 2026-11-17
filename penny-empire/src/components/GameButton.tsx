import { ReactNode, useEffect, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { disabledGradient, goldGradient, greenGradient } from '../theme';

const useNative = Platform.OS !== 'web';

type Variant = 'green' | 'gold';

interface Props {
  variant?: Variant;
  disabled?: boolean;
  /** Sweep a glint across the button to draw the eye (e.g. an affordable enhancement). */
  shimmer?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}

/** Chunky, glossy game button with a 3D bottom edge that squishes when pressed. */
export function GameButton({ variant = 'green', disabled, shimmer, onPress, style, children }: Props) {
  const [press] = useState(() => new Animated.Value(0));
  const [glint] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!shimmer || disabled) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glint, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: useNative }),
        Animated.delay(1400),
        Animated.timing(glint, { toValue: 0, duration: 0, useNativeDriver: useNative }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer, disabled, glint]);

  const colors = disabled ? disabledGradient : variant === 'gold' ? goldGradient : greenGradient;
  const edge = disabled ? '#15282298' : variant === 'gold' ? '#9A6300' : '#0A5C3C';

  const animate = (to: number) =>
    Animated.spring(press, { toValue: to, friction: 5, tension: 300, useNativeDriver: useNative }).start();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => animate(1)}
      onPressOut={() => animate(0)}
      style={style}
    >
      <View style={[styles.edge, { backgroundColor: edge }]}>
        <Animated.View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ transform: [{ translateY: press.interpolate({ inputRange: [0, 1], outputRange: [0, 3] }) }] }}
        >
          <LinearGradient colors={colors} style={styles.face}>
            <View style={styles.gloss} pointerEvents="none" />
            {children}
            {shimmer && !disabled && width > 0 && (
              <Animated.View
                pointerEvents="none"
                style={[
                  styles.glint,
                  { transform: [{ translateX: glint.interpolate({ inputRange: [0, 1], outputRange: [-60, width + 60] }) }, { rotate: '20deg' }] },
                ]}
              />
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  edge: { borderRadius: 14, paddingBottom: 4 },
  face: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  gloss: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '48%',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  glint: { position: 'absolute', top: -20, bottom: -20, left: 0, width: 26, backgroundColor: 'rgba(255,255,255,0.45)' },
});
