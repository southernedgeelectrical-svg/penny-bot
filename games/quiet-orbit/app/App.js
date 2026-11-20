import { useEffect, useRef } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import GAME_HTML from './game';

const BG = '#0b0e18';

function Game() {
  const web = useRef(null);
  const insets = useSafeAreaInsets();

  // Save progress whenever the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        web.current?.injectJavaScript("window.dispatchEvent(new Event('pagehide'));true;");
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <StatusBar style="light" />
      <WebView
        ref={web}
        style={styles.web}
        originWhitelist={['*']}
        source={{ html: GAME_HTML, baseUrl: 'https://quietorbit.app/' }}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        overScrollMode="never"
        bounces={false}
        setBuiltInZoomControls={false}
        textZoom={100}
        allowsBackForwardNavigationGestures={false}
        onShouldStartLoadWithRequest={(req) => req.url.startsWith('https://quietorbit.app') || req.url === 'about:blank'}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider style={{ backgroundColor: BG }}>
      <Game />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  web: { flex: 1, backgroundColor: BG },
});
