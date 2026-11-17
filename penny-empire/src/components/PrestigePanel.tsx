import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GOLD_BAR_BONUS, PRESTIGE_THRESHOLD } from '../game/definitions';
import { GameState, goldBarsForRun, prestigeMultiplier } from '../game/economy';
import { formatMoney, formatNumber } from '../game/format';
import { colors } from '../theme';
import { confirm } from './confirm';

interface Props {
  game: GameState;
  onPrestige: () => void;
  onReset: () => void;
}

export function PrestigePanel({ game, onPrestige, onReset }: Props) {
  const bars = goldBarsForRun(game.runEarned);
  const nextBarAt = Math.pow(bars + 1, 2) * PRESTIGE_THRESHOLD;
  const newMultiplier = 1 + (game.goldBars + bars) * GOLD_BAR_BONUS;

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.heading}>🥇 Gold Bars: {formatNumber(game.goldBars)}</Text>
        <Text style={styles.body}>
          Each gold bar permanently boosts all income by {GOLD_BAR_BONUS * 100}%. Current bonus: ×
          {prestigeMultiplier(game).toFixed(1)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>💼 Cash Out</Text>
        <Text style={styles.body}>
          Sell your empire and start over from $0 — keeping your gold bars. Earned this run: {formatMoney(game.runEarned)}
        </Text>
        <Text style={styles.body}>
          {bars > 0
            ? `Cash out now for ${formatNumber(bars)} gold bar${bars === 1 ? '' : 's'} (bonus becomes ×${newMultiplier.toFixed(1)}). Next bar at ${formatMoney(nextBarAt)} earned.`
            : `Earn ${formatMoney(PRESTIGE_THRESHOLD)} in one run to get your first gold bar.`}
        </Text>
        <Pressable
          disabled={bars <= 0}
          onPress={() =>
            confirm(
              'Cash out?',
              `You'll reset to $0 and lose all upgrades, but gain ${bars} gold bar${bars === 1 ? '' : 's'}.`,
              'Cash out',
              onPrestige,
            )
          }
          style={({ pressed }) => [styles.button, bars <= 0 && styles.disabled, pressed && { opacity: 0.75 }]}
        >
          <Text style={styles.buttonLabel}>{bars > 0 ? `Cash out for ${formatNumber(bars)} 🥇` : 'Not yet'}</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>📊 Stats</Text>
        <Text style={styles.body}>All-time earnings: {formatMoney(game.allTimeEarned)}</Text>
        <Text style={styles.body}>Total taps: {formatNumber(game.totalTaps)}</Text>
        <Text style={styles.body}>Times cashed out: {game.prestigeCount}</Text>
      </View>

      <Pressable
        onPress={() => confirm('Erase all progress?', 'This deletes everything, including gold bars.', 'Erase', onReset)}
        style={styles.reset}
      >
        <Text style={styles.resetLabel}>Reset all progress</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingBottom: 24 },
  card: {
    backgroundColor: colors.bgRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  heading: { color: colors.text, fontSize: 17, fontWeight: '800' },
  body: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  button: {
    marginTop: 6,
    backgroundColor: colors.goldDark,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabled: { backgroundColor: colors.disabled, opacity: 0.7 },
  buttonLabel: { color: colors.text, fontSize: 16, fontWeight: '800' },
  reset: { alignItems: 'center', paddingVertical: 10 },
  resetLabel: { color: '#E57373', fontSize: 13 },
});
