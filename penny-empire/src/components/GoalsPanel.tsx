import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ACHIEVEMENTS, AchievementDef } from '../game/achievements';
import { dailyStatus } from '../game/daily';
import { ACHIEVEMENT_BONUS } from '../game/definitions';
import { achievementMultiplier } from '../game/economy';
import { formatClock, formatMoney, formatNumber } from '../game/format';
import { GameState } from '../game/types';
import { colors, fonts, goldGradient } from '../theme';
import { DailyStreak } from './DailyStreak';
import { GameButton } from './GameButton';
import { ProgressBar } from './ProgressBar';

interface Props {
  game: GameState;
  onClaimDaily: () => void;
  onClaimAchievement: (id: string) => void;
}

function secondsToMidnight(now: number) {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return (d.getTime() - now) / 1000;
}

export function GoalsPanel({ game, onClaimDaily, onClaimAchievement }: Props) {
  const now = game.lastActive;
  const daily = dailyStatus(game, now);
  const done = game.claimed.length;
  // Claimable first, then closest to finishing, then already claimed.
  const sorted = [...ACHIEVEMENTS].sort((a, b) => rankOf(game, a) - rankOf(game, b));

  return (
    <View style={styles.wrap}>
      <LinearGradient colors={['#3B2A05', '#241903']} style={[styles.card, styles.dailyCard]}>
        <View style={styles.row}>
          <Text style={styles.heading}>📅 Daily Bonus</Text>
          <Text style={styles.small}>Come back every day for bigger rewards</Text>
        </View>
        <DailyStreak claimedThrough={daily.available ? daily.day - 1 : game.daily.streak} today={daily.available ? daily.day : null} />
        {daily.available ? (
          <GameButton variant="gold" shimmer onPress={onClaimDaily}>
            <Text style={styles.claimLabel}>CLAIM DAY {daily.day} · {formatMoney(daily.reward)}</Text>
          </GameButton>
        ) : (
          <Text style={styles.comeBack}>Claimed! Next bonus in {formatClock(secondsToMidnight(now))}</Text>
        )}
      </LinearGradient>

      <View style={styles.trophyHeader}>
        <Text style={styles.heading}>🏆 Achievements</Text>
        <Text style={styles.trophyStat}>
          {done}/{ACHIEVEMENTS.length} · income ×{achievementMultiplier(game).toFixed(2)}
        </Text>
      </View>
      <Text style={styles.small}>Each one you claim adds +{ACHIEVEMENT_BONUS * 100}% to all income, forever.</Text>

      {sorted.map((a) => (
        <AchievementRow key={a.id} def={a} game={game} onClaim={onClaimAchievement} />
      ))}
    </View>
  );
}

function rankOf(s: GameState, a: AchievementDef) {
  if (s.achieved.includes(a.id) && !s.claimed.includes(a.id)) return -1;
  if (s.claimed.includes(a.id)) return 2;
  return 1 - Math.min(1, a.progress(s) / a.goal);
}

function AchievementRow({ def, game, onClaim }: { def: AchievementDef; game: GameState; onClaim: (id: string) => void }) {
  const claimed = game.claimed.includes(def.id);
  const ready = game.achieved.includes(def.id) && !claimed;
  const progress = Math.min(def.goal, def.progress(game));
  const fmt = (n: number) => (def.money ? formatMoney(n) : formatNumber(Math.floor(n)));

  return (
    <LinearGradient
      colors={ready ? ['#4A3A0C', '#2B2106'] : ['#164535', colors.card, colors.cardEdge]}
      style={[styles.card, styles.row, ready && styles.readyCard, claimed && styles.claimedCard]}
    >
      <View style={[styles.trophy, (ready || claimed) && styles.trophyLit]}>
        <Text style={styles.trophyEmoji}>{def.emoji}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={styles.name}>{def.name}</Text>
        <Text style={styles.small}>{def.description}</Text>
        {!claimed && !ready && (
          <View style={styles.progressRow}>
            <View style={styles.flex}>
              <ProgressBar progress={progress / def.goal} colors={goldGradient} height={6} />
            </View>
            <Text style={styles.progressText}>
              {fmt(progress)} / {fmt(def.goal)}
            </Text>
          </View>
        )}
      </View>
      {ready && (
        <GameButton variant="gold" shimmer onPress={() => onClaim(def.id)}>
          <Text style={styles.smallClaim}>CLAIM</Text>
          <Text style={styles.smallClaimSub}>+{ACHIEVEMENT_BONUS * 100}%</Text>
        </GameButton>
      )}
      {claimed && <Text style={styles.check}>✓</Text>}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingBottom: 24 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, gap: 10 },
  dailyCard: { borderColor: 'rgba(255,211,77,0.4)' },
  readyCard: { borderColor: colors.gold, borderWidth: 2 },
  claimedCard: { opacity: 0.6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0 },
  heading: { color: colors.text, fontFamily: fonts.display, fontSize: 20 },
  small: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  claimLabel: { color: '#4A2C00', fontFamily: fonts.display, fontSize: 16, paddingVertical: 3 },
  comeBack: { color: colors.goldLight, fontFamily: fonts.bodyHeavy, fontSize: 14, textAlign: 'center' },
  trophyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, flexWrap: 'wrap' },
  trophyStat: { color: colors.green, fontFamily: fonts.bodyHeavy, fontSize: 13 },
  trophy: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  trophyLit: { backgroundColor: 'rgba(255,211,77,0.25)', opacity: 1 },
  trophyEmoji: { fontSize: 22 },
  name: { color: colors.text, fontFamily: fonts.bodyHeavy, fontSize: 15 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressText: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  smallClaim: { color: '#4A2C00', fontFamily: fonts.display, fontSize: 14 },
  smallClaimSub: { color: '#4A2C00', fontFamily: fonts.bodyHeavy, fontSize: 11 },
  check: { color: colors.green, fontFamily: fonts.display, fontSize: 24, paddingHorizontal: 6 },
});
