import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { EARNERS, TAP_UPGRADES, UpgradeDef } from './src/game/definitions';
import {
  bulkCost,
  enhanceStatus,
  GameState,
  levelOf,
  maxAffordable,
  perSecond,
  perTap,
  prestigeMultiplier,
  tierOf,
  upgradeOutput,
} from './src/game/economy';
import { formatMoney } from './src/game/format';
import { useGame } from './src/game/useGame';
import { TapCoin } from './src/components/TapCoin';
import { UpgradeCard } from './src/components/UpgradeCard';
import { PrestigePanel } from './src/components/PrestigePanel';
import { colors } from './src/theme';

type Tab = 'tap' | 'business' | 'prestige';
type BuyMode = 1 | 10 | 'max';

const TABS: { key: Tab; label: string }[] = [
  { key: 'tap', label: '👆 Tap Power' },
  { key: 'business', label: '🏢 Businesses' },
  { key: 'prestige', label: '🥇 Cash Out' },
];

export default function App() {
  return (
    <SafeAreaProvider>
      <Game />
    </SafeAreaProvider>
  );
}

function Game() {
  const { game, loaded, offlineEarned, tap, buy, enhance, prestige, reset, dismissOffline } = useGame();
  const [tab, setTab] = useState<Tab>('tap');
  const [buyMode, setBuyMode] = useState<BuyMode>(1);

  const onBuy = useCallback((id: string) => buy(id, buyMode), [buy, buyMode]);

  if (!loaded) {
    return <View style={styles.screen} />;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(Math.floor(game.balance))}
        </Text>
        <Text style={styles.rates}>
          {formatMoney(perTap(game))} per tap · {formatMoney(perSecond(game))} per sec
          {game.goldBars > 0 ? ` · 🥇×${prestigeMultiplier(game).toFixed(1)}` : ''}
        </Text>
      </View>

      <TapCoin perTap={perTap(game)} onTap={tap} />

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab !== 'prestige' && (
        <View style={styles.buyModes}>
          <Text style={styles.buyModesLabel}>Buy</Text>
          {([1, 10, 'max'] as BuyMode[]).map((m) => (
            <Pressable key={String(m)} onPress={() => setBuyMode(m)} style={[styles.mode, buyMode === m && styles.modeActive]}>
              <Text style={[styles.modeLabel, buyMode === m && styles.modeLabelActive]}>{m === 'max' ? 'MAX' : `×${m}`}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {tab === 'prestige' ? (
          <PrestigePanel game={game} onPrestige={prestige} onReset={reset} />
        ) : (
          visibleUpgrades(game, tab === 'tap' ? TAP_UPGRADES : EARNERS).map((def) => (
            <UpgradeRow key={def.id} def={def} game={game} buyMode={buyMode} onBuy={onBuy} onEnhance={enhance} />
          ))
        )}
      </ScrollView>

      <Modal visible={offlineEarned !== null} transparent animationType="fade" onRequestClose={dismissOffline}>
        <View style={styles.backdrop}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Welcome back! 💰</Text>
            <Text style={styles.modalBody}>Your businesses earned while you were away:</Text>
            <Text style={styles.modalAmount}>{formatMoney(offlineEarned ?? 0)}</Text>
            <Pressable onPress={dismissOffline} style={styles.modalButton}>
              <Text style={styles.modalButtonLabel}>Collect</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** Show owned upgrades plus the next one or two you're working toward, so the list unfolds as you grow. */
function visibleUpgrades(game: GameState, defs: UpgradeDef[]): UpgradeDef[] {
  let lastOwned = -1;
  defs.forEach((d, i) => {
    if (levelOf(game, d.id) > 0) lastOwned = i;
  });
  return defs.slice(0, Math.max(2, lastOwned + 3));
}

function UpgradeRow({
  def,
  game,
  buyMode,
  onBuy,
  onEnhance,
}: {
  def: UpgradeDef;
  game: GameState;
  buyMode: BuyMode;
  onBuy: (id: string) => void;
  onEnhance: (id: string) => void;
}) {
  const level = levelOf(game, def.id);
  const count = buyMode === 'max' ? maxAffordable(def, level, game.balance) : buyMode;
  // In MAX mode with nothing affordable, still show the price of the next level.
  const shownCount = count > 0 ? count : 1;
  const cost = bulkCost(def, level, shownCount);
  return (
    <UpgradeCard
      def={def}
      level={level}
      tier={tierOf(game, def.id)}
      output={upgradeOutput(game, def) * prestigeMultiplier(game)}
      buyCount={shownCount}
      buyCost={cost}
      canBuy={count > 0 && cost <= game.balance}
      enhance={enhanceStatus(game, def)}
      onBuy={onBuy}
      onEnhance={onEnhance}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { alignItems: 'center', paddingTop: 12, paddingHorizontal: 16 },
  balance: { color: colors.gold, fontSize: 44, fontWeight: '900' },
  rates: { color: colors.muted, fontSize: 14, marginTop: 2, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: colors.bgRaised,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: colors.bgPressed },
  tabLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  tabLabelActive: { color: colors.text },
  buyModes: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 10 },
  buyModesLabel: { color: colors.muted, fontSize: 13, marginRight: 4 },
  mode: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  modeActive: { backgroundColor: colors.greenDark, borderColor: colors.greenDark },
  modeLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  modeLabelActive: { color: colors.text },
  list: { flex: 1, marginTop: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: {
    backgroundColor: colors.bgRaised,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 22, fontWeight: '800' },
  modalBody: { color: colors.muted, fontSize: 14, textAlign: 'center' },
  modalAmount: { color: colors.gold, fontSize: 34, fontWeight: '900', marginVertical: 6 },
  modalButton: { backgroundColor: colors.greenDark, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 40 },
  modalButtonLabel: { color: colors.text, fontSize: 16, fontWeight: '800' },
});
