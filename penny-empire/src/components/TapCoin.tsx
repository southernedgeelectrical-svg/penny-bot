import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, GestureResponderEvent, Platform, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { formatMoney } from '../game/format';
import { CoinRank } from '../game/ranks';
import { colors, fonts } from '../theme';
import { CoinArt, COIN_PALETTES } from './CoinArt';

export const DEFAULT_COIN_SIZE = 180;
const MAX_FLOATS = 10;
const MAX_PARTICLES = 36;
const PARTICLES_PER_TAP = 5;
const useNative = Platform.OS !== 'web';
// react-native-web waits 50ms before firing onPressIn and drops it for quicker taps; fire immediately instead.
const webNoPressDelay = (Platform.OS === 'web' ? { delayPressIn: 0 } : {}) as object;

interface Float {
  id: number;
  x: number;
  y: number;
  label: string;
  /** Made by an auto clicker (drawn smaller, in a different color). */
  auto: boolean;
  progress: Animated.Value;
}

/** Most auto-click animations shown per second; faster robots show bigger amounts per pulse instead. */
const MAX_AUTO_PULSES_PER_SEC = 5;

interface Particle {
  id: number;
  x: number;
  y: number;
  xs: number[];
  ys: number[];
  spin: number;
  size: number;
  progress: Animated.Value;
}

const TIMES = [0, 0.25, 0.5, 0.75, 1];

/** $46.6 → $47, but keep cents on small amounts like $1.5. */
const roundForDisplay = (n: number) => (n >= 10 ? Math.round(n) : n);

function makeParticle(id: number, x: number, y: number): Particle {
  // Upward-biased burst with gravity, sampled into keyframes for interpolate().
  const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
  const speed = 110 + Math.random() * 90;
  const vx = Math.cos(angle) * speed;
  const vy = Math.sin(angle) * speed;
  const g = 320;
  return {
    id,
    x,
    y,
    xs: TIMES.map((t) => vx * t),
    ys: TIMES.map((t) => vy * t + g * t * t),
    spin: (Math.random() - 0.5) * 720,
    size: 12 + Math.random() * 8,
    progress: new Animated.Value(0),
  };
}

function TapCoinImpl({
  tapValue,
  autoClicksPerSec = 0,
  rank,
  onTap,
  size = DEFAULT_COIN_SIZE,
}: {
  /** What one tap is worth right now (including combo). */
  tapValue: number;
  autoClicksPerSec?: number;
  rank: CoinRank['id'];
  onTap: () => void;
  size?: number;
}) {
  const SIZE = size;
  const STAGE = Math.round(size * 1.67);
  const STAGE_H = Math.round(size * 1.45);
  const [tapScale] = useState(() => new Animated.Value(1));
  const [breath] = useState(() => new Animated.Value(0));
  const [spin] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(1));
  const [floats, setFloats] = useState<Float[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const nextId = useRef(0);
  const firstRank = useRef(true);

  useEffect(() => {
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
        Animated.timing(breath, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: useNative }),
      ]),
    );
    const s = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 24000, easing: Easing.linear, useNativeDriver: useNative }));
    b.start();
    s.start();
    return () => {
      b.stop();
      s.stop();
    };
  }, [breath, spin]);

  // Burst of light when the coin upgrades to a new metal.
  useEffect(() => {
    if (firstRank.current) {
      firstRank.current = false;
      return;
    }
    flash.setValue(0);
    Animated.timing(flash, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }).start();
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [rank, flash]);

  /** Floating amount + coin burst at (x, y) on the stage. */
  const spawn = useCallback((x: number, y: number, label: string, particleCount: number, auto: boolean) => {
    const float: Float = { id: nextId.current++, x, y, label, auto, progress: new Animated.Value(0) };
    setFloats((f) => [...f.slice(-(MAX_FLOATS - 1)), float]);
    Animated.timing(float.progress, { toValue: 1, duration: 1000, easing: Easing.out(Easing.quad), useNativeDriver: useNative }).start(() =>
      setFloats((f) => f.filter((v) => v.id !== float.id)),
    );
    const burst = Array.from({ length: particleCount }, () => makeParticle(nextId.current++, x, y));
    setParticles((ps) => [...ps.slice(-(MAX_PARTICLES - burst.length)), ...burst]);
    for (const p of burst) {
      Animated.timing(p.progress, { toValue: 1, duration: 750, easing: Easing.linear, useNativeDriver: useNative }).start(() =>
        setParticles((ps) => ps.filter((v) => v.id !== p.id)),
      );
    }
  }, []);

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      onTap();
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

      tapScale.setValue(0.88);
      Animated.spring(tapScale, { toValue: 1, friction: 3, tension: 220, useNativeDriver: useNative }).start();

      // Spawn effects where the finger touched (coordinates relative to the coin).
      const lx = e.nativeEvent.locationX;
      const ly = e.nativeEvent.locationY;
      const x = (STAGE - SIZE) / 2 + (Number.isFinite(lx) ? lx : SIZE / 2);
      const y = (STAGE_H - SIZE) / 2 + (Number.isFinite(ly) ? ly : SIZE / 2);
      spawn(x, y, '+' + formatMoney(roundForDisplay(tapValue)), PARTICLES_PER_TAP, false);
    },
    [onTap, tapValue, tapScale, spawn, SIZE, STAGE, STAGE_H],
  );

  // Auto clickers: visibly "tap" the coin. The money itself is added by the game loop;
  // this only shows it, with at most a few pulses per second.
  const pulsesPerSec = autoClicksPerSec > 0 ? Math.min(MAX_AUTO_PULSES_PER_SEC, Math.max(0.5, autoClicksPerSec)) : 0;
  const pulseAmount = useRef(0);
  useEffect(() => {
    pulseAmount.current = pulsesPerSec > 0 ? (tapValue * autoClicksPerSec) / pulsesPerSec : 0;
  }, [tapValue, autoClicksPerSec, pulsesPerSec]);
  const pulseKey = Math.round(pulsesPerSec * 4); // only restart the timer when the rate really changes
  useEffect(() => {
    if (pulseKey === 0) return;
    const timer = setInterval(() => {
      tapScale.setValue(0.95);
      Animated.spring(tapScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: useNative }).start();
      const angle = Math.random() * Math.PI * 2;
      const r = SIZE * 0.3 * Math.random();
      spawn(STAGE / 2 + Math.cos(angle) * r, STAGE_H / 2 + Math.sin(angle) * r, '🤖 +' + formatMoney(roundForDisplay(pulseAmount.current)), 2, true);
    }, 1000 / (pulseKey / 4));
    return () => clearInterval(timer);
  }, [pulseKey, spawn, tapScale, SIZE, STAGE, STAGE_H]);

  const palette = COIN_PALETTES[rank];
  const scale = Animated.multiply(tapScale, breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] }));
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <View style={[styles.stage, { width: STAGE, height: STAGE_H }]}>
      <Animated.View
        style={[styles.rays, { top: (STAGE_H - STAGE) / 2, width: STAGE, height: STAGE, transform: [{ rotate }] }]}
        pointerEvents="none"
      >
        <Rays color={palette.faceMid} stage={STAGE} />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.flash,
          { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderColor: palette.rimLight },
          {
            opacity: flash.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0] }),
            transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.7] }) }],
          },
        ]}
      />

      <Pressable {...webNoPressDelay} onPressIn={handlePress} accessibilityRole="button" accessibilityLabel={`Tap to earn ${formatMoney(tapValue)}`}>
        <Animated.View style={[styles.coin, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, transform: [{ scale }] }]}>
          <CoinArt size={SIZE} rank={rank} />
        </Animated.View>
      </Pressable>

      {particles.map((p) => (
        <Animated.View
          key={p.id}
          pointerEvents="none"
          style={[
            styles.particle,
            {
              left: p.x - p.size / 2,
              top: p.y - p.size / 2,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: palette.faceMid,
              borderColor: palette.rimDark,
              opacity: p.progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateX: p.progress.interpolate({ inputRange: TIMES, outputRange: p.xs }) },
                { translateY: p.progress.interpolate({ inputRange: TIMES, outputRange: p.ys }) },
                { rotate: p.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
                { scaleX: 0.75 },
              ],
            },
          ]}
        >
          <View style={[styles.particleShine, { backgroundColor: palette.faceLight }]} />
        </Animated.View>
      ))}

      {floats.map((f) => (
        <Animated.Text
          key={f.id}
          pointerEvents="none"
          style={[
            styles.float,
            f.auto && styles.floatAuto,
            {
              left: f.x - 100,
              top: f.y - 20,
              opacity: f.progress.interpolate({ inputRange: [0, 0.65, 1], outputRange: [1, 1, 0] }),
              transform: [
                { translateY: f.progress.interpolate({ inputRange: [0, 1], outputRange: [-10, -110] }) },
                { scale: f.progress.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0.6, 1.15, 1] }) },
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

/** Soft light rays fanning out behind the coin. */
const Rays = memo(function Rays({ color, stage: STAGE }: { color: string; stage: number }) {
  const n = 14;
  const c = STAGE / 2;
  const r = STAGE / 2;
  const d = Array.from({ length: n }, (_, i) => {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / n / 2.2;
    return `M${c} ${c}L${c + Math.cos(a0) * r} ${c + Math.sin(a0) * r}L${c + Math.cos(a1) * r} ${c + Math.sin(a1) * r}Z`;
  }).join('');
  return (
    <Svg width={STAGE} height={STAGE}>
      <Defs>
        <RadialGradient id="rays" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0.3" stopColor={color} stopOpacity="0.45" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={color} stopOpacity="0.55" />
          <Stop offset="0.55" stopColor={color} stopOpacity="0.12" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Path d={`M0 0H${STAGE}V${STAGE}H0Z`} fill="url(#glow)" />
      <Path d={d} fill="url(#rays)" />
    </Svg>
  );
});

export const TapCoin = memo(TapCoinImpl);

const styles = StyleSheet.create({
  rays: { position: 'absolute', left: 0 },
  stage: { alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginVertical: -10 },
  coin: {
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 14,
  },
  flash: {
    position: 'absolute',
    borderWidth: 6,
  },
  particle: { position: 'absolute', borderWidth: 1.5, overflow: 'hidden' },
  particleShine: { position: 'absolute', top: 2, left: 2, width: '40%', height: '40%', borderRadius: 99, opacity: 0.8 },
  floatAuto: { fontSize: 18, color: '#9EE7FF', textShadowColor: 'rgba(0, 30, 60, 0.9)' },
  float: {
    position: 'absolute',
    width: 200,
    textAlign: 'center',
    fontFamily: fonts.display,
    fontSize: 28,
    color: colors.goldLight,
    textShadowColor: 'rgba(80, 40, 0, 0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
});
