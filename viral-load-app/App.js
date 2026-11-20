import { useEffect, useRef } from 'react';
import { AppState, BackHandler, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as SplashScreen from 'expo-splash-screen';
import * as Haptics from 'expo-haptics';
import gameHtml from './src/gameHtml';

const BG = '#060912';
// A fixed https origin gives the game a stable localStorage, so saves survive app restarts.
const ORIGIN = 'https://viralload.app/';

const HAPTICS = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  rigid: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid),
  select: () => Haptics.selectionAsync(),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
};

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
    // Back closes popups / returns to the main tab first; the game asks to exit when there's nothing left to close.
    const back = BackHandler.addEventListener('hardwareBackPress', () => {
      web.current?.injectJavaScript('window.__vlBack && window.__vlBack(); true;');
      return true;
    });
    return () => { sub.remove(); back.remove(); };
  }, []);

  const onMessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.nativeEvent.data); } catch { return; }
    if (msg.t === 'haptic' && HAPTICS[msg.k]) HAPTICS[msg.k]().catch(() => {});
    else if (msg.t === 'exit') { web.current?.injectJavaScript('window.__vlSave && window.__vlSave(); true;'); BackHandler.exitApp(); }
  };

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
          onMessage={onMessage}
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
