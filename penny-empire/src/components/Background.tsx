import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { colors } from '../theme';

// Fixed "random" sparkles so the layout is stable between renders.
const SPARKLES = [
  [0.08, 0.06, 1.6], [0.9, 0.04, 1.2], [0.18, 0.3, 1], [0.82, 0.24, 1.8], [0.05, 0.5, 1.2],
  [0.95, 0.46, 1], [0.12, 0.72, 1.4], [0.88, 0.68, 1.2], [0.5, 0.9, 1], [0.3, 0.97, 1.4], [0.7, 0.85, 1.6],
] as const;

/** Deep emerald gradient with a warm glow at the top, a faint diamond pattern and sparkles. */
function BackgroundImpl() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[colors.bgTop, colors.bg, colors.bgBottom]} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="topGlow" cx="0.5" cy="0.22" r="0.6">
            <Stop offset="0" stopColor="#FFD34D" stopOpacity="0.16" />
            <Stop offset="1" stopColor="#FFD34D" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#topGlow)" />
        {SPARKLES.map(([x, y, r], i) => (
          <Circle key={i} cx={`${x * 100}%`} cy={`${y * 100}%`} r={r} fill="#FFF3B0" fillOpacity={0.35} />
        ))}
      </Svg>
    </View>
  );
}

export const Background = memo(BackgroundImpl);

/** Four-point twinkle star, used for decoration. */
export function Twinkle({ size = 14, color = colors.goldLight }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Path d="M10 0C11 7 13 9 20 10C13 11 11 13 10 20C9 13 7 11 0 10C7 9 9 7 10 0Z" fill={color} />
    </Svg>
  );
}
