import { useEffect, useRef } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';
import gameHtml from './src/gameHtml';

const BG = '#060912';
// A fixed https origin gives the game a stable localStorage, so saves survive app restarts.
const ORIGIN = 'https://viralload.app/';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const web = useRef(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (!web.current) return;
      if (state === 'active') {
        web.current.injectJavaScript('window.__vlResume && window.__vlResume(); true;');
      } else {
        web.current.injectJavaScript('window.__vlSave && window.__vlSave(); true;');
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']}>
        <StatusBar style="light" />
        <WebView
          ref={web}
          style={styles.web}
          originWhitelist={['*']}
          source={{ html: gameHtml, baseUrl: ORIGIN }}
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          overScrollMode="never"
          bounces={false}
          setBuiltInZoomControls={false}
          textZoom={100}
          setSupportMultipleWindows={false}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          onLoadEnd={() => SplashScreen.hideAsync().catch(() => {})}
          containerStyle={styles.web}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  web: { flex: 1, backgroundColor: BG },
});
