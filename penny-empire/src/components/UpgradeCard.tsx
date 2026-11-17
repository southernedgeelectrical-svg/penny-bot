import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UpgradeDef } from '../game/definitions';
import { EnhanceStatus } from '../game/economy';
import { formatMoney } from '../game/format';
import { colors } from '../theme';

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
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.emoji}>{def.emoji}</Text>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={styles.name} numberOfLines={1}>{def.name}</Text>
            {tier > 0 && <Text style={styles.stars}>{'★'.repeat(Math.min(tier, 5))}{tier > 5 ? `+${tier - 5}` : ''}</Text>}
          </View>
          <Text style={styles.sub}>
            Lv {level} · {level > 0 ? `${formatMoney(output)}${unit}` : def.description}
          </Text>
        </View>
        <Pressable
          onPress={() => onBuy(def.id)}
          disabled={!canBuy}
          style={({ pressed }) => [styles.buy, !canBuy && styles.buyDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.buyLabel}>{buyCount > 1 ? `Buy ×${buyCount}` : 'Buy'}</Text>
          <Text style={styles.buyCost}>{buyCount > 0 ? formatMoney(Math.ceil(buyCost)) : '—'}</Text>
        </Pressable>
      </View>
      <EnhanceRow status={enhance} tier={tier} onPress={() => onEnhance(def.id)} />
    </View>
  );
}

function EnhanceRow({ status, tier, onPress }: { status: EnhanceStatus; tier: number; onPress: () => void }) {
  if (status.kind === 'maxed') {
    return <Text style={styles.enhanceNote}>★ Fully enhanced</Text>;
  }
  if (status.kind === 'locked') {
    return (
      <Text style={styles.enhanceNote}>
        ★{tier + 1} Enhance (×2 output) unlocks at Lv {status.requiredLevel}
      </Text>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={!status.affordable}
      style={({ pressed }) => [styles.enhance, !status.affordable && styles.enhanceDisabled, pressed && styles.pressed]}
    >
      <Text style={styles.enhanceLabel}>
        ★ Enhance to ★{tier + 1} — doubles output · {formatMoney(Math.ceil(status.cost))}
      </Text>
    </Pressable>
  );
}

export const UpgradeCard = memo(UpgradeCardImpl);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgRaised,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 30, width: 40, textAlign: 'center' },
  info: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { color: colors.text, fontSize: 16, fontWeight: '700', flexShrink: 1 },
  stars: { color: colors.star, fontSize: 13, fontWeight: '800' },
  sub: { color: colors.muted, fontSize: 13, marginTop: 2 },
  buy: {
    backgroundColor: colors.greenDark,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 92,
    alignItems: 'center',
  },
  buyDisabled: { backgroundColor: colors.disabled, opacity: 0.7 },
  buyLabel: { color: colors.text, fontSize: 12, fontWeight: '600' },
  buyCost: { color: colors.text, fontSize: 15, fontWeight: '800' },
  pressed: { opacity: 0.75 },
  enhance: {
    backgroundColor: colors.goldDark,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  enhanceDisabled: { backgroundColor: colors.disabled, opacity: 0.8 },
  enhanceLabel: { color: colors.text, fontSize: 13, fontWeight: '700' },
  enhanceNote: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
