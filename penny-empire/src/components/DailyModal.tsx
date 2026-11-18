import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { DailyStatus } from '../game/daily';
import { formatMoney } from '../game/format';
import { colors, fonts } from '../theme';
import { DailyStreak } from './DailyStreak';
import { GameButton } from './GameButton';

export function DailyModal({ status, visible, onClaim, onLater }: { status: DailyStatus; visible: boolean; onClaim: () => void; onLater: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <LinearGradient colors={['#3B2A05', '#1E1503']} style={styles.box}>
          <Text style={styles.gift}>🎁</Text>
          <Text style={styles.title}>Daily Bonus</Text>
          <Text style={styles.body}>
            {status.day === 1 ? 'Claim a bonus every day. Keep the streak going for bigger rewards!' : `Day ${status.day} in a row. Nice!`}
          </Text>
          <DailyStreak claimedThrough={status.day - 1} today={status.day} />
          <Text style={styles.amount}>+{formatMoney(status.reward)}</Text>
          <GameButton variant="gold" shimmer onPress={onClaim} style={{ alignSelf: 'stretch' }}>
            <Text style={styles.claim}>CLAIM</Text>
          </GameButton>
          <Pressable onPress={onLater} style={styles.later}>
            <Text style={styles.laterText}>Later</Text>
          </Pressable>
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  box: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 26,
    padding: 20,
    gap: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,211,77,0.6)',
  },
  gift: { fontSize: 48 },
  title: { color: colors.goldLight, fontFamily: fonts.display, fontSize: 30 },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
  amount: {
    color: colors.gold,
    fontFamily: fonts.display,
    fontSize: 40,
    textShadowColor: 'rgba(120, 70, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  claim: { color: '#4A2C00', fontFamily: fonts.display, fontSize: 20, paddingVertical: 4, letterSpacing: 1 },
  later: { paddingVertical: 4 },
  laterText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
});
