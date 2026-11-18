import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';
import { GameButton } from './GameButton';

const PAGES = [
  { emoji: '🪙', title: 'Tap the coin', body: 'Every tap earns cash. You start with nothing but a copper penny.' },
  { emoji: '🏢', title: 'Buy upgrades', body: 'Tap Power makes each tap worth more. Businesses earn money every second, even while you’re away.' },
  { emoji: '⭐', title: 'Upgrade your upgrades', body: 'At level 10, 25, 50 and beyond, add a star to an upgrade to double what it earns.' },
  { emoji: '📈', title: 'Invest', body: 'Take on timed Deals or trade in the Markets. Bigger risks can pay bigger rewards.' },
  { emoji: '🏆', title: 'Goals & Cash Out', body: 'Claim achievements and daily bonuses for permanent boosts. Later, cash out for gold bars and start an even richer empire.' },
];

export function Tutorial({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;
  const p = PAGES[page];
  const close = () => {
    setPage(0);
    onDone();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}>
        <LinearGradient colors={['#1B5640', '#0E3326']} style={styles.box}>
          <Text style={styles.step}>HOW TO PLAY · {page + 1}/{PAGES.length}</Text>
          <Text style={styles.emoji}>{p.emoji}</Text>
          <Text style={styles.title}>{p.title}</Text>
          <Text style={styles.body}>{p.body}</Text>
          <View style={styles.dots}>
            {PAGES.map((_, i) => (
              <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
            ))}
          </View>
          <GameButton variant="gold" onPress={() => (last ? close() : setPage(page + 1))} style={{ alignSelf: 'stretch' }}>
            <Text style={styles.next}>{last ? "LET'S GET RICH" : 'NEXT'}</Text>
          </GameButton>
          {!last && (
            <Pressable onPress={close} style={styles.skip}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 26,
    padding: 24,
    gap: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,211,77,0.5)',
  },
  step: { color: colors.gold, fontFamily: fonts.display, fontSize: 12, letterSpacing: 2 },
  emoji: { fontSize: 56, marginVertical: 4 },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 28, textAlign: 'center' },
  body: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 22, textAlign: 'center', minHeight: 66 },
  dots: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
  dotActive: { backgroundColor: colors.gold, width: 22 },
  next: { color: '#4A2C00', fontFamily: fonts.display, fontSize: 18, paddingVertical: 4, letterSpacing: 1 },
  skip: { paddingVertical: 4 },
  skipText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
});
