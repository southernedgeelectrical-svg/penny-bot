import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export function ProgressBar({ progress, colors, height = 8 }: { progress: number; colors: readonly [string, string, ...string[]]; height?: number }) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      {pct > 0 && (
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: `${pct * 100}%`, height: '100%', borderRadius: height / 2 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { backgroundColor: 'rgba(0,0,0,0.35)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
});
