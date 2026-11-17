import { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { GOLD_BAR_BONUS, PRESTIGE_THRESHOLD } from '../game/definitions';
import { GameState, goldBarsForRun, prestigeMultiplier } from '../game/economy';
import { formatMoney, formatNumber } from '../game/format';
import { colors, fonts, goldGradient } from '../theme';
import { ConfirmDialog, ConfirmRequest } from './ConfirmDialog';
import { GameButton } from './GameButton';
import { GoldBar } from './GoldBar';
import { ProgressBar } from './ProgressBar';

interface Props {
  game: GameState;
  onPrestige: () => void;
  onReset: () => void;
}

export function PrestigePanel({ game, onPrestige, onReset }: Props) {
  const bars = goldBarsForRun(game.runEarned);
  const prevBarAt = Math.pow(bars, 2) * PRESTIGE_THRESHOLD;
  const nextBarAt = Math.pow(bars + 1, 2) * PRESTIGE_THRESHOLD;
  const newMultiplier = 1 + (game.goldBars + bars) * GOLD_BAR_BONUS;
  const [confirming, setConfirming] = useState<ConfirmRequest | null>(null);
  const progress = (game.runEarned - (bars > 0 ? prevBarAt : 0)) / (nextBarAt - (bars > 0 ? prevBarAt : 0));

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#3B2A05', '#241903']} style={[styles.card, styles.vault]}>
        <GoldBar size={84} />
        <View style={{ flex: 1 }}>
          <Text style={styles.vaultLabel}>YOUR VAULT</Text>
          <Text style={styles.vaultCount}>{formatNumber(game.goldBars)} Gold Bars</Text>
          <Text style={styles.vaultBonus}>All income ×{prestigeMultiplier(game).toFixed(1)}</Text>
        </View>
      </LinearGradient>

      <Card title="Cash Out">
        <Text style={styles.body}>
          Sell your empire and start again from a single penny. You keep your gold bars, and each one adds{' '}
          <Text style={styles.highlight}>+{GOLD_BAR_BONUS * 100}% income forever</Text>.
        </Text>
        <View style={styles.statLine}>
          <Text style={styles.body}>Earned this run</Text>
          <Text style={styles.statValue}>{formatMoney(game.runEarned)}</Text>
        </View>
        <ProgressBar progress={progress} colors={goldGradient} height={12} />
        <Text style={styles.small}>
          {bars > 0
            ? `Next gold bar at ${formatMoney(nextBarAt)} · cashing out now makes income ×${newMultiplier.toFixed(1)}`
            : `First gold bar at ${formatMoney(PRESTIGE_THRESHOLD)} earned`}
        </Text>
        <GameButton
          variant="gold"
          shimmer={bars > 0}
          disabled={bars <= 0}
          onPress={() =>
            setConfirming({
              title: 'Cash out?',
              message: `You'll restart from $0 and lose your upgrades, but gain ${bars} gold bar${bars === 1 ? '' : 's'} for good.`,
              confirmLabel: 'Cash out',
              onConfirm: onPrestige,
            })
          }
          style={{ marginTop: 4 }}
        >
          <Text style={[styles.buttonLabel, bars <= 0 && { color: colors.muted }]}>
            {bars > 0 ? `CASH OUT FOR ${formatNumber(bars)} GOLD BAR${bars === 1 ? '' : 'S'}` : 'KEEP EARNING'}
          </Text>
        </GameButton>
      </Card>

      <Card title="Stats">
        <Stat label="All-time earnings" value={formatMoney(game.allTimeEarned)} />
        <Stat label="Total taps" value={formatNumber(game.totalTaps)} />
        <Stat label="Times cashed out" value={String(game.prestigeCount)} />
      </Card>

      <Pressable
        onPress={() =>
          setConfirming({
            title: 'Erase all progress?',
            message: 'This deletes everything, including your gold bars. It cannot be undone.',
            confirmLabel: 'Erase',
            danger: true,
            onConfirm: onReset,
          })
        }
        style={styles.reset}
      >
        <Text style={styles.resetLabel}>Reset all progress</Text>
      </Pressable>

      <ConfirmDialog request={confirming} onClose={() => setConfirming(null)} />
    </View>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <LinearGradient colors={['#164535', colors.card, colors.cardEdge]} style={styles.card}>
      <Text style={styles.heading}>{title}</Text>
      {children}
    </LinearGradient>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statLine}>
      <Text style={styles.body}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, paddingBottom: 24 },
  card: { borderRadius: 20, borderWidth: 1, borderColor: colors.cardBorder, padding: 16, gap: 10 },
  vault: { flexDirection: 'row', alignItems: 'center', gap: 14, borderColor: 'rgba(255,211,77,0.4)' },
  vaultLabel: { color: colors.gold, fontFamily: fonts.display, fontSize: 12, letterSpacing: 2 },
  vaultCount: { color: colors.goldLight, fontFamily: fonts.display, fontSize: 26 },
  vaultBonus: { color: colors.green, fontFamily: fonts.bodyHeavy, fontSize: 14 },
  heading: { color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  highlight: { color: colors.gold, fontFamily: fonts.bodyHeavy },
  small: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  statLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statValue: { color: colors.text, fontFamily: fonts.display, fontSize: 18 },
  buttonLabel: { color: '#4A2C00', fontFamily: fonts.display, fontSize: 17, letterSpacing: 0.5, paddingVertical: 4 },
  reset: { alignItems: 'center', paddingVertical: 10 },
  resetLabel: { color: colors.danger, fontFamily: fonts.body, fontSize: 13 },
});
