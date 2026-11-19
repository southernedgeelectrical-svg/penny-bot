import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';

const FIRE = ['#FFE680', '#FF9F1C', '#FF4D2E'] as const;

/** 🔥 Combo bar: fills as you tap fast, shows the current tap multiplier. */
function ComboMeterImpl({ level, multiplier, max }: { level: number; multiplier: number; max: number }) {
  const hot = level > 0.02;
  const full = level >= 0.999;
  return (
    <View style={styles.wrap} accessibilityLabel={`Combo times ${multiplier.toFixed(1)}`}>
      <Text style={[styles.icon, !hot && styles.dim]}>🔥</Text>
      <View style={styles.track}>
        {hot && (
          <LinearGradient
            colors={FIRE}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.fill, { width: `${Math.min(1, level) * 100}%` }]}
          />
        )}
        <Text style={styles.trackText}>
          {hot ? (full ? 'MAX COMBO!' : 'COMBO') : `Tap fast for up to ×${max.toFixed(1)}`}
        </Text>
      </View>
      {hot && <Text style={[styles.mult, styles.multHot]}>×{multiplier.toFixed(1)}</Text>}
    </View>
  );
}

export const ComboMeter = memo(ComboMeterImpl);

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%', maxWidth: 300, alignSelf: 'center', paddingHorizontal: 16 },
  icon: { fontSize: 16 },
  dim: { opacity: 0.45 },
  track: {
    flex: 1,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,159,28,0.35)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 8 },
  trackText: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 10,
    letterSpacing: 1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  mult: { fontFamily: fonts.display, fontSize: 15, minWidth: 38, textAlign: 'right', color: colors.muted },
  multHot: { color: '#FFB347' },
});
