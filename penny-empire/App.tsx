import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
// Import single weights so unused font files aren't bundled into the app.
import { LilitaOne_400Regular } from '@expo-google-fonts/lilita-one/400Regular';
import { Nunito_700Bold } from '@expo-google-fonts/nunito/700Bold';
import { Nunito_900Black } from '@expo-google-fonts/nunito/900Black';
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
import { rankFor } from './src/game/ranks';
import { useGame } from './src/game/useGame';
import { Background, Twinkle } from './src/components/Background';
import { CoinArt } from './src/components/CoinArt';
import { GameButton } from './src/components/GameButton';
import { PrestigePanel } from './src/components/PrestigePanel';
import { ProgressBar } from './src/components/ProgressBar';
import { TapCoin } from './src/components/TapCoin';
import { UpgradeCard } from './src/components/UpgradeCard';
import { colors, fonts, goldGradient, greenGradient } from './src/theme';

type Tab = 'tap' | 'business' | 'prestige';
type BuyMode = 1 | 10 | 'max';

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'tap', icon: '👆', label: 'Tap Power' },
  { key: 'business', icon: '🏢', label: 'Businesses' },
  { key: 'prestige', icon: '🥇', label: 'Cash Out' },
];

export default function App() {
  const [fontsLoaded] = useFonts({ LilitaOne_400Regular, Nunito_700Bold, Nunito_900Black });
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Background />
      {fontsLoaded ? <Game /> : null}
    </SafeAreaProvider>
  );
}

function Game() {
  const { game, loaded, offlineEarned, tap, buy, enhance, prestige, reset, dismissOffline } = useGame();
  const [tab, setTab] = useState<Tab>('tap');
  const [buyMode, setBuyMode] = useState<BuyMode>(1);

  const onBuy = useCallback((id: string) => buy(id, buyMode), [buy, buyMode]);
  const { width, height } = useWindowDimensions();

  if (!loaded) return null;

  const { rank, next, progress } = rankFor(game.runEarned);
  const tapValue = perTap(game);

  // Tablets and landscape screens: coin on the left, shop on the right.
  const wide = width >= 700 && width > height;
  const coinSize = Math.round(
    wide ? Math.min(300, height * 0.4, width * 0.24) : Math.min(width >= 600 ? 260 : 180, height * 0.24),
  );

  const coinArea = (
    <>
      <View style={styles.header}>
        <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit>
          {formatMoney(Math.floor(game.balance))}
        </Text>
        <View style={styles.chips}>
          <Chip icon="👆" text={`${formatMoney(tapValue)}/tap`} />
          <Chip icon="⏱️" text={`${formatMoney(perSecond(game))}/sec`} />
          {game.goldBars > 0 && <Chip icon="🥇" text={`×${prestigeMultiplier(game).toFixed(1)}`} />}
        </View>
      </View>

      <TapCoin perTap={tapValue} rank={rank.id} onTap={tap} size={coinSize} />

      <View style={styles.rank}>
        <View style={styles.rankRow}>
          <Twinkle size={12} />
          <Text style={styles.rankName}>{rank.name}</Text>
          <Twinkle size={12} />
        </View>
        {next && (
          <>
            <ProgressBar progress={progress} colors={goldGradient} height={6} />
            <Text style={styles.rankNext}>Earn {formatMoney(next.minEarned)} this run to unlock the {next.name}</Text>
          </>
        )}
      </View>
    </>
  );

  const shop = (
    <>
      <View style={styles.tabs}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable key={t.key} onPress={() => setTab(t.key)} style={styles.tab}>
              {active && <LinearGradient colors={greenGradient} style={[StyleSheet.absoluteFill, styles.tabActive]} />}
              <Text style={styles.tabIcon}>{t.icon}</Text>
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab !== 'prestige' && (
        <View style={styles.buyModes}>
          <Text style={styles.buyModesLabel}>BUY</Text>
          {([1, 10, 'max'] as BuyMode[]).map((m) => {
            const active = buyMode === m;
            return (
              <Pressable key={String(m)} onPress={() => setBuyMode(m)} style={[styles.mode, active && styles.modeActive]}>
                <Text style={[styles.modeLabel, active && styles.modeLabelActive]}>{m === 'max' ? 'MAX' : `×${m}`}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {tab === 'prestige' ? (
          <PrestigePanel game={game} onPrestige={prestige} onReset={reset} />
        ) : (
          visibleUpgrades(game, tab === 'tap' ? TAP_UPGRADES : EARNERS).map((def) => (
            <UpgradeRow key={def.id} def={def} game={game} buyMode={buyMode} onBuy={onBuy} onEnhance={enhance} />
          ))
        )}
      </ScrollView>
    </>
  );

  return (
    <SafeAreaView style={styles.screen}>
      {wide ? (
        <View style={styles.wideRow}>
          <View style={styles.widePlay}>{coinArea}</View>
          <View style={styles.wideShop}>{shop}</View>
        </View>
      ) : (
        <View style={styles.narrow}>
          {coinArea}
          {shop}
        </View>
      )}

      <Modal visible={offlineEarned !== null} transparent animationType="fade" onRequestClose={dismissOffline}>
        <View style={styles.backdrop}>
          <LinearGradient colors={['#1B5640', '#0E3326']} style={styles.modal}>
            <View style={styles.modalCoin}>
              <CoinArt size={96} rank={rank.id} />
            </View>
            <Text style={styles.modalTitle}>Welcome back!</Text>
            <Text style={styles.modalBody}>Your businesses kept earning while you were away</Text>
            <Text style={styles.modalAmount}>+{formatMoney(offlineEarned ?? 0)}</Text>
            <GameButton variant="gold" shimmer onPress={dismissOffline} style={{ alignSelf: 'stretch' }}>
              <Text style={styles.modalButtonLabel}>COLLECT</Text>
            </GameButton>
          </LinearGradient>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.chipIcon}>{icon}</Text>
      <Text style={styles.chipText}>{text}</Text>
    </View>
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
  screen: { flex: 1 },
  narrow: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  wideRow: { flex: 1, flexDirection: 'row', paddingHorizontal: 12, gap: 12 },
  widePlay: { flex: 1, justifyContent: 'center' },
  wideShop: { flex: 1.15, maxWidth: 680, paddingTop: 12 },
  header: { alignItems: 'center', paddingTop: 8, paddingHorizontal: 16 },
  balance: {
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 52,
    textShadowColor: 'rgba(120, 70, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  chips: { flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap', justifyContent: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  chipIcon: { fontSize: 12 },
  chipText: { color: colors.text, fontFamily: fonts.bodyHeavy, fontSize: 13 },
  rank: { alignItems: 'stretch', width: '100%', maxWidth: 300, alignSelf: 'center', paddingHorizontal: 16, gap: 4, marginBottom: 10 },
  rankRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  rankName: { color: colors.goldLight, fontFamily: fonts.display, fontSize: 16, letterSpacing: 0.5 },
  rankNext: { color: colors.muted, fontFamily: fonts.body, fontSize: 11, textAlign: 'center' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 16,
    padding: 4,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  tab: { flex: 1, paddingVertical: 7, borderRadius: 12, alignItems: 'center', overflow: 'hidden' },
  tabActive: { borderRadius: 12 },
  tabIcon: { fontSize: 16 },
  tabLabel: { color: colors.muted, fontSize: 12, fontFamily: fonts.bodyHeavy },
  tabLabelActive: { color: colors.text },
  buyModes: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 10 },
  buyModesLabel: { color: colors.muted, fontFamily: fonts.display, fontSize: 13, marginRight: 4, letterSpacing: 1 },
  mode: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  modeActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  modeLabel: { color: colors.muted, fontFamily: fonts.display, fontSize: 14 },
  modeLabelActive: { color: '#4A2C00' },
  list: { flex: 1, marginTop: 10 },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modal: {
    borderRadius: 26,
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
    gap: 6,
    width: '100%',
    maxWidth: 340,
    borderWidth: 2,
    borderColor: 'rgba(255,211,77,0.5)',
  },
  modalCoin: { position: 'absolute', top: -48 },
  modalTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 30 },
  modalBody: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
  modalAmount: {
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 44,
    marginVertical: 8,
    textShadowColor: 'rgba(120, 70, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  modalButtonLabel: { color: '#4A2C00', fontFamily: fonts.display, fontSize: 20, letterSpacing: 1, paddingVertical: 4 },
});
