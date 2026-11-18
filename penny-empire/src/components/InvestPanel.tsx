import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DEAL_BY_ID, MAX_ACTIVE } from '../game/deals';
import { INVEST_UNLOCK } from '../game/definitions';
import { formatClock, formatDuration, formatMoney, formatPercent } from '../game/format';
import { investUnlocked } from '../game/game';
import { ASSETS, AssetDef, portfolioValue, positionValue, recentChange } from '../game/market';
import { ActiveDeal, DealOffer, GameState } from '../game/types';
import { colors, fonts, goldGradient } from '../theme';
import { GameButton } from './GameButton';
import { ProgressBar } from './ProgressBar';
import { Sparkline } from './Sparkline';

interface Props {
  game: GameState;
  onStartDeal: (offerId: number) => void;
  onCollectDeal: (dealId: number) => void;
  onBuyAsset: (id: string, amount: number) => void;
  onSellAsset: (id: string) => void;
}

const RISK_COLORS: Record<AssetDef['risk'], string> = {
  Low: '#3BE39A',
  Medium: '#FFD34D',
  High: '#FF9F43',
  'Very high': '#FF6B6B',
};

export function InvestPanel({ game, onStartDeal, onCollectDeal, onBuyAsset, onSellAsset }: Props) {
  // The game ticks every 100ms; lastActive is "now" for countdowns.
  const now = game.lastActive;

  if (!investUnlocked(game)) {
    return (
      <LinearGradient colors={['#164535', colors.card, colors.cardEdge]} style={styles.card}>
        <Text style={styles.lockEmoji}>🔒</Text>
        <Text style={styles.heading}>Investing opens soon</Text>
        <Text style={styles.body}>
          Earn {formatMoney(INVEST_UNLOCK)} in total to unlock Deals and Markets: new ways to grow your money.
        </Text>
        <ProgressBar progress={game.allTimeEarned / INVEST_UNLOCK} colors={goldGradient} height={10} />
        <Text style={styles.small}>
          {formatMoney(Math.floor(game.allTimeEarned))} / {formatMoney(INVEST_UNLOCK)}
        </Text>
      </LinearGradient>
    );
  }

  const holdings = portfolioValue(game);
  const invested = Object.values(game.market.positions).reduce((sum, p) => sum + p.cost, 0);
  const inDeals = game.deals.active.reduce((sum, d) => sum + d.cost, 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.summary}>
        <SummaryStat label="IN MARKETS" value={formatMoney(holdings)} sub={invested > 0 ? formatPercent(holdings / invested - 1) : '—'} up={holdings >= invested} />
        <SummaryStat label="IN DEALS" value={formatMoney(inDeals)} sub={`${game.deals.active.length}/${MAX_ACTIVE} running`} />
      </View>

      <Text style={styles.section}>🤝 Deals</Text>
      <Text style={styles.sectionHint}>Pay up front, wait, then collect. Risky deals pay more but can fall through.</Text>

      {game.deals.active.map((d) => (
        <ActiveDealCard key={d.id} deal={d} now={now} onCollect={onCollectDeal} />
      ))}
      {game.deals.offers.map((o) => (
        <OfferCard
          key={o.id}
          offer={o}
          now={now}
          canAfford={game.balance >= o.cost}
          slotFree={game.deals.active.length < MAX_ACTIVE}
          onStart={onStartDeal}
        />
      ))}

      <Text style={[styles.section, { marginTop: 8 }]}>📊 Markets</Text>
      <Text style={styles.sectionHint}>Buy when prices dip, sell when they climb. Charts show the last 10 minutes.</Text>
      {ASSETS.map((a) => (
        <AssetCard key={a.id} asset={a} game={game} onBuy={onBuyAsset} onSell={onSellAsset} />
      ))}
    </View>
  );
}

function SummaryStat({ label, value, sub, up }: { label: string; value: string; sub: string; up?: boolean }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.summarySub, up === true && { color: colors.green }, up === false && { color: colors.danger }]}>{sub}</Text>
    </View>
  );
}

function oddsColor(chance: number) {
  return chance >= 0.85 ? colors.green : chance >= 0.5 ? colors.gold : colors.danger;
}

const OfferCard = memo(function OfferCard({
  offer,
  now,
  canAfford,
  slotFree,
  onStart,
}: {
  offer: DealOffer;
  now: number;
  canAfford: boolean;
  slotFree: boolean;
  onStart: (id: number) => void;
}) {
  const t = DEAL_BY_ID[offer.templateId];
  if (!t) return null;
  const multiple = offer.payout / offer.cost;
  return (
    <LinearGradient colors={['#164535', colors.card, colors.cardEdge]} style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.dealEmoji}>{t.emoji}</Text>
        <View style={styles.flex}>
          <Text style={styles.name}>{t.name}</Text>
          <Text style={styles.small}>{t.blurb}</Text>
        </View>
      </View>
      <View style={styles.chips}>
        <Chip text={`⏱ ${formatDuration(offer.durationSec)}`} />
        <Chip text={`${Math.round(offer.chance * 100)}% odds`} color={oddsColor(offer.chance)} />
        <Chip text={`Pays ${formatMoney(offer.payout)} (×${multiple.toFixed(1)})`} color={colors.goldLight} />
      </View>
      <View style={styles.row}>
        <Text style={[styles.small, styles.flex]}>Offer ends in {formatClock((offer.expiresAt - now) / 1000)}</Text>
        <GameButton onPress={() => onStart(offer.id)} disabled={!canAfford || !slotFree} style={styles.investButton}>
          <Text style={styles.buttonLabel}>{slotFree ? `INVEST ${formatMoney(offer.cost)}` : 'DEALS FULL'}</Text>
        </GameButton>
      </View>
    </LinearGradient>
  );
});

function ActiveDealCard({ deal, now, onCollect }: { deal: ActiveDeal; now: number; onCollect: (id: number) => void }) {
  const t = DEAL_BY_ID[deal.templateId];
  const total = t ? t.durationSec : 1;
  const left = Math.max(0, (deal.endsAt - now) / 1000);
  const done = left <= 0;
  return (
    <LinearGradient colors={done ? ['#4A3A0C', '#2B2106'] : ['#123E30', '#0B2A20']} style={[styles.card, done && styles.cardReady]}>
      <View style={styles.row}>
        <Text style={styles.dealEmoji}>{t?.emoji ?? '🤝'}</Text>
        <View style={styles.flex}>
          <Text style={styles.name}>{t?.name ?? 'Deal'}</Text>
          <Text style={styles.small}>
            Staked {formatMoney(deal.cost)} · could pay {formatMoney(deal.payout)}
          </Text>
        </View>
      </View>
      {done ? (
        <GameButton variant="gold" shimmer onPress={() => onCollect(deal.id)}>
          <Text style={styles.collectLabel}>FINISHED · TAP TO SEE THE RESULT</Text>
        </GameButton>
      ) : (
        <View style={styles.row}>
          <View style={styles.flex}>
            <ProgressBar progress={1 - left / total} colors={goldGradient} height={10} />
          </View>
          <Text style={styles.timer}>{formatClock(left)}</Text>
        </View>
      )}
    </LinearGradient>
  );
}

function AssetCard({
  asset,
  game,
  onBuy,
  onSell,
}: {
  asset: AssetDef;
  game: GameState;
  onBuy: (id: string, amount: number) => void;
  onSell: (id: string) => void;
}) {
  const change = recentChange(game, asset.id);
  const value = positionValue(game, asset.id);
  const pos = game.market.positions[asset.id];
  const pl = pos ? value / pos.cost - 1 : 0;
  const small = Math.floor(game.balance * 0.1);
  const half = Math.floor(game.balance * 0.5);

  return (
    <LinearGradient colors={['#164535', colors.card, colors.cardEdge]} style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.dealEmoji}>{asset.emoji}</Text>
        <View style={styles.flex}>
          <View style={styles.titleRow}>
            <Text style={styles.name}>{asset.name}</Text>
            <View style={[styles.risk, { borderColor: RISK_COLORS[asset.risk] }]}>
              <Text style={[styles.riskText, { color: RISK_COLORS[asset.risk] }]}>{asset.risk.toUpperCase()} RISK</Text>
            </View>
          </View>
          <Text style={styles.small}>{asset.blurb}</Text>
        </View>
        <View style={styles.chart}>
          <Sparkline points={game.market.history[asset.id] ?? []} width={84} height={40} />
          <Text style={[styles.change, { color: change >= 0 ? colors.green : colors.danger }]}>{formatPercent(change)}</Text>
        </View>
      </View>

      {pos && (
        <View style={styles.holding}>
          <Text style={styles.holdingText}>You own {formatMoney(value)}</Text>
          <Text style={[styles.holdingText, { color: pl >= 0 ? colors.green : colors.danger }]}>
            {pl >= 0 ? '▲' : '▼'} {formatPercent(pl)} ({formatMoney(Math.abs(value - pos.cost))})
          </Text>
        </View>
      )}

      <View style={styles.tradeRow}>
        <GameButton onPress={() => onBuy(asset.id, small)} disabled={small < 1} style={styles.flex}>
          <Text style={styles.tradeLabel}>BUY 10%</Text>
          <Text style={styles.tradeSub}>{small >= 1 ? formatMoney(small) : '—'}</Text>
        </GameButton>
        <GameButton onPress={() => onBuy(asset.id, half)} disabled={half < 1} style={styles.flex}>
          <Text style={styles.tradeLabel}>BUY 50%</Text>
          <Text style={styles.tradeSub}>{half >= 1 ? formatMoney(half) : '—'}</Text>
        </GameButton>
        <GameButton variant="gold" onPress={() => onSell(asset.id)} disabled={!pos} style={styles.flex}>
          <Text style={[styles.tradeLabel, pos && styles.dark]}>SELL ALL</Text>
          <Text style={[styles.tradeSub, pos && styles.dark]}>{pos ? formatMoney(value) : '—'}</Text>
        </GameButton>
      </View>
    </LinearGradient>
  );
}

function Chip({ text, color }: { text: string; color?: string }) {
  return (
    <View style={styles.chip}>
      <Text style={[styles.chipText, color ? { color } : null]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingBottom: 24 },
  card: { borderRadius: 18, borderWidth: 1, borderColor: colors.cardBorder, padding: 12, gap: 10 },
  cardReady: { borderColor: colors.gold, borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 0 },
  lockEmoji: { fontSize: 36, textAlign: 'center' },
  heading: { color: colors.text, fontFamily: fonts.display, fontSize: 22, textAlign: 'center' },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  small: { color: colors.muted, fontFamily: fonts.body, fontSize: 12 },
  section: { color: colors.goldLight, fontFamily: fonts.display, fontSize: 20, marginTop: 4 },
  sectionHint: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: -6 },
  summary: { flexDirection: 'row', gap: 10 },
  summaryStat: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  summaryLabel: { color: colors.muted, fontFamily: fonts.display, fontSize: 11, letterSpacing: 1 },
  summaryValue: { color: colors.text, fontFamily: fonts.display, fontSize: 22 },
  summarySub: { color: colors.muted, fontFamily: fonts.bodyHeavy, fontSize: 12 },
  dealEmoji: { fontSize: 30, width: 40, textAlign: 'center' },
  name: { color: colors.text, fontFamily: fonts.bodyHeavy, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { color: colors.text, fontFamily: fonts.bodyHeavy, fontSize: 12 },
  investButton: { minWidth: 150 },
  buttonLabel: { color: colors.text, fontFamily: fonts.display, fontSize: 14, paddingVertical: 2 },
  collectLabel: { color: '#4A2C00', fontFamily: fonts.display, fontSize: 14, paddingVertical: 2 },
  timer: { color: colors.goldLight, fontFamily: fonts.display, fontSize: 18, minWidth: 54, textAlign: 'right' },
  risk: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  riskText: { fontFamily: fonts.display, fontSize: 9, letterSpacing: 0.5 },
  chart: { alignItems: 'flex-end' },
  change: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  holding: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  holdingText: { color: colors.text, fontFamily: fonts.bodyHeavy, fontSize: 13 },
  tradeRow: { flexDirection: 'row', gap: 8 },
  tradeLabel: { color: colors.text, fontFamily: fonts.display, fontSize: 13 },
  tradeSub: { color: colors.text, fontFamily: fonts.bodyHeavy, fontSize: 12 },
  dark: { color: '#4A2C00' },
});
