import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme';

/** Red count bubble for tabs ("3 things you can do here"). */
export function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.badge} pointerEvents="none">
      <Text style={styles.text}>{count > 9 ? '9+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 2,
    right: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: '#E5484D',
    borderWidth: 1.5,
    borderColor: '#08221A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { color: '#FFFFFF', fontFamily: fonts.display, fontSize: 11, lineHeight: 14 },
});
