import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { STREAK_LENGTH } from '../game/daily';
import { colors, fonts, goldGradient } from '../theme';

/**
 * Seven day bubbles. `claimedThrough` days are done; `today` (if set) is the one you can claim now.
 */
export function DailyStreak({ claimedThrough, today }: { claimedThrough: number; today: number | null }) {
  return (
    <View style={styles.row}>
      {Array.from({ length: STREAK_LENGTH }, (_, i) => {
        const day = i + 1;
        const done = day <= claimedThrough;
        const isToday = day === today;
        const jackpot = day === STREAK_LENGTH;
        return (
          <View key={day} style={styles.col}>
            {done || isToday ? (
              <LinearGradient colors={isToday ? goldGradient : ['#2FD18A', '#119160']} style={[styles.dot, isToday && styles.today]}>
                <Text style={[styles.dotText, isToday && styles.dark]}>{done ? '✓' : jackpot ? '🎁' : day}</Text>
              </LinearGradient>
            ) : (
              <View style={[styles.dot, styles.future]}>
                <Text style={styles.futureText}>{jackpot ? '🎁' : day}</Text>
              </View>
            )}
            <Text style={styles.label}>Day {day}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 4 },
  col: { alignItems: 'center', gap: 3, flex: 1 },
  dot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 2, borderColor: '#FFFFFF' },
  future: { backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  dotText: { color: colors.text, fontFamily: fonts.display, fontSize: 15 },
  dark: { color: '#4A2C00' },
  futureText: { color: colors.muted, fontFamily: fonts.display, fontSize: 14 },
  label: { color: colors.muted, fontFamily: fonts.body, fontSize: 10 },
});
