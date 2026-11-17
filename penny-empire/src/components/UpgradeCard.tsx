import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TIER_LEVEL_REQUIREMENTS, UpgradeDef } from '../game/definitions';
import { EnhanceStatus } from '../game/economy';
import { formatMoney } from '../game/format';
import { colors, fonts, goldGradient, tierBadge } from '../theme';
import { GameButton } from './GameButton';
import { ProgressBar } from './ProgressBar';

interface Props {
  def: UpgradeDef;
  level: number;
  tier: number;
  output: number;
  buyCount: number;
  buyCost: number;
  canBuy: boolean;
  enhance: EnhanceStatus;
  onBuy: (id: string) => void;
  onEnhance: (id: string) => void;
}

function UpgradeCardImpl({ def, level, tier, output, buyCount, buyCost, canBuy, enhance, onBuy, onEnhance }: Props) {
  const unit = def.kind === 'tap' ? '/tap' : '/sec';
  const badge = tierBadge(tier);
  const owned = level > 0;

  return (
    <LinearGradient colors={['#164535', colors.card, colors.cardEdge]} style={styles.card}>
      <View style={styles.row}>
        <View>
          <LinearGradient colors={badge} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={[styles.badge, !owned && styles.badgeUnowned]}>
            <View style={styles.badgeInner}>
              <Text style={styles.emoji}>{def.emoji}</Text>
            </View>
          </LinearGradient>
          {tier > 0 && (
            <View style={styles.starPill}>
              <Text style={styles.starText}>★{tier}</Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{def.name}</Text>
          <View style={styles.statRow}>
            <View style={styles.levelPill}>
              <Text style={styles.levelText}>LV {level}</Text>
            </View>
            <Text style={[styles.output, !owned && styles.outputMuted]} numberOfLines={1}>
              {owned ? `+${formatMoney(output)}${unit}` : def.description}
            </Text>
          </View>
          <StarProgress status={enhance} level={level} tier={tier} />
        </View>

        <GameButton onPress={() => onBuy(def.id)} disabled={!canBuy} style={styles.buy}>
          <Text style={styles.buyLabel}>{buyCount > 1 ? `BUY ×${buyCount}` : 'BUY'}</Text>
          <View style={styles.costRow}>
            <MiniCoin />
            <Text style={styles.buyCost} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(Math.ceil(buyCost)).slice(1)}
            </Text>
          </View>
        </GameButton>
      </View>

      {enhance.kind === 'available' && (
        <GameButton variant="gold" shimmer disabled={!enhance.affordable} onPress={() => onEnhance(def.id)}>
          <Text style={styles.enhanceLabel}>
            ⭐ ENHANCE TO ★{tier + 1} · DOUBLE OUTPUT · {formatMoney(Math.ceil(enhance.cost))}
          </Text>
        </GameButton>
      )}
    </LinearGradient>
  );
}

function StarProgress({ status, level, tier }: { status: EnhanceStatus; level: number; tier: number }) {
  if (status.kind === 'maxed') {
    return <Text style={styles.progressLabel}>★ MAX STARS</Text>;
  }
  const prev = TIER_LEVEL_REQUIREMENTS[tier - 1] ?? 0;
  const next = TIER_LEVEL_REQUIREMENTS[tier];
  const progress = status.kind === 'available' ? 1 : (level - prev) / (next - prev);
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <ProgressBar progress={progress} colors={goldGradient} height={7} />
      </View>
      <Text style={styles.progressLabel}>
        {status.kind === 'available' ? `★${tier + 1} ready!` : `★${tier + 1} at LV ${next}`}
      </Text>
    </View>
  );
}

function MiniCoin() {
  return (
    <View style={styles.miniCoin}>
      <Text style={styles.miniCoinText}>$</Text>
    </View>
  );
}

export const UpgradeCard = memo(UpgradeCardImpl);

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 58, height: 58, borderRadius: 29, padding: 3 },
  badgeUnowned: { opacity: 0.55 },
  badgeInner: {
    flex: 1,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  starPill: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    backgroundColor: '#1B1206',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: colors.star,
  },
  starText: { color: colors.star, fontFamily: fonts.display, fontSize: 11 },
  info: { flex: 1, minWidth: 0, gap: 4 },
  name: { color: colors.text, fontSize: 17, fontFamily: fonts.bodyHeavy },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelPill: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  levelText: { color: colors.goldLight, fontFamily: fonts.display, fontSize: 12, letterSpacing: 0.5 },
  output: { color: colors.green, fontFamily: fonts.bodyHeavy, fontSize: 13, flexShrink: 1 },
  outputMuted: { color: colors.muted },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progressTrack: { flex: 1, maxWidth: 90 },
  progressLabel: { color: colors.muted, fontFamily: fonts.body, fontSize: 11 },
  buy: { minWidth: 96 },
  buyLabel: { color: colors.text, fontFamily: fonts.display, fontSize: 13, letterSpacing: 0.5 },
  costRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  buyCost: { color: colors.text, fontFamily: fonts.display, fontSize: 18, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
  miniCoin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.gold,
    borderWidth: 1.5,
    borderColor: colors.goldDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniCoinText: { color: colors.goldDark, fontSize: 8, fontWeight: '900', lineHeight: 10 },
  enhanceLabel: {
    color: '#4A2C00',
    fontFamily: fonts.display,
    fontSize: 14,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(255,255,255,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
});
