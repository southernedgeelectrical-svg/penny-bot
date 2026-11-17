import { Component, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

/** If something crashes, show what happened instead of a blank screen. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>Penny Empire hit an error and stopped. Your saved progress is safe.</Text>
        <Text style={styles.detail} selectable>
          {error.message}
        </Text>
        <Pressable onPress={() => this.setState({ error: null })} style={styles.button}>
          <Text style={styles.buttonLabel}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

// Uses system fonts on purpose: this screen must work even if custom fonts failed.
const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  title: { color: colors.gold, fontSize: 24, fontWeight: '800' },
  body: { color: colors.text, fontSize: 15, textAlign: 'center' },
  detail: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  button: { backgroundColor: colors.greenBottom, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 24 },
  buttonLabel: { color: colors.text, fontSize: 16, fontWeight: '800' },
});
