import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, fonts } from '../theme';
import { GameButton } from './GameButton';

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
}

/** In-game yes/no dialog, styled like the rest of the game (works the same on Android, iOS and web). */
export function ConfirmDialog({ request, onClose }: { request: ConfirmRequest | null; onClose: () => void }) {
  return (
    <Modal visible={request !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        {request && (
          <LinearGradient colors={['#1B5640', '#0E3326']} style={styles.box}>
            <Text style={styles.title}>{request.title}</Text>
            <Text style={styles.message}>{request.message}</Text>
            <View style={styles.row}>
              <Pressable onPress={onClose} style={styles.cancel} accessibilityRole="button">
                <Text style={styles.cancelLabel}>CANCEL</Text>
              </Pressable>
              <GameButton
                variant={request.danger ? 'red' : 'gold'}
                onPress={() => {
                  onClose();
                  request.onConfirm();
                }}
                style={{ flex: 1 }}
              >
                <Text style={[styles.confirmLabel, request.danger && styles.dangerLabel]}>{request.confirmLabel.toUpperCase()}</Text>
              </GameButton>
            </View>
          </LinearGradient>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  box: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 22,
    gap: 10,
    borderWidth: 2,
    borderColor: 'rgba(255,211,77,0.5)',
  },
  title: { color: colors.text, fontFamily: fonts.display, fontSize: 26, textAlign: 'center' },
  message: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  row: { flexDirection: 'row', gap: 10, marginTop: 8, alignItems: 'center' },
  cancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
  },
  cancelLabel: { color: colors.muted, fontFamily: fonts.display, fontSize: 16 },
  confirmLabel: { color: '#4A2C00', fontFamily: fonts.display, fontSize: 16, paddingVertical: 4 },
  dangerLabel: { color: colors.text },
});
